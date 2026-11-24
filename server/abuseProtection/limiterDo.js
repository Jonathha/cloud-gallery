const WINDOW_DURATION = 15 * 60 * 1000;

export class RateLimiter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
    this.tracking = null;
  }

  async initTracking(body, now) {
    if (!this.tracking) {
      this.tracking = (await this.storage.get('tracking')) || null;
    }

    // Auto-migração: Normaliza estados legados que foram bloqueados por falsos positivos de probes (/api/version)
    if (this.tracking && (!this.tracking.schemaVersion || this.tracking.schemaVersion < 2)) {
      this.tracking.schemaVersion = 2;
      if (this.tracking.blockedUntil > now) {
        this.tracking.blockedUntil = 0;
        this.tracking.attempts = 0;
      }
      await this.storage.put('tracking', this.tracking);
    }

    if (!this.tracking || now - this.tracking.windowStart >= WINDOW_DURATION) {
      this.tracking = {
        schemaVersion: 2,
        id: body.id || 'unknown',
        module: body.module || 'general',
        windowStart: now,
        attempts: 0,
        requestsInWindow: 0,
        blockedUntil: 0,
        captchaRequired: false,
        captchaVerified: false,
        captchaSolvedAtAttempts: 0,
        recentAttempts: [],
        verifiedShares: {},
      };
    }
    if (!this.tracking.verifiedShares) {
      this.tracking.verifiedShares = {};
    }
  }

  async handleCheck(body, now) {
    const { path = '', module = 'general', method = 'GET', isTor = false, isHighThreat = false, isDatacenterVpn = false, shareId = null } = body;
    const isSuspicious = isTor || isHighThreat || isDatacenterVpn;
    const delayMs = isTor ? 3000 : (isSuspicious ? 2000 : 0);

    if (this.tracking.blockedUntil > now) {
      const waitSeconds = Math.max(1, Math.ceil((this.tracking.blockedUntil - now) / 1000));
      return new Response(
        JSON.stringify({
          blocked: true,
          response: {
            success: false,
            error: `Acesso temporariamente suspenso. Por favor, aguarde ${waitSeconds} segundos.`,
            blocked: true,
            retryAfter: waitSeconds,
          },
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    this.tracking.requestsInWindow = (this.tracking.requestsInWindow || 0) + 1;

    // Vincula a validação do captcha especificamente ao shareId acessado
    const targetShareId = shareId || (path.startsWith('/api/share/view/') ? path.replace('/api/share/view/', '').split('/')[0].split('?')[0] : null);
    let isCurrentCaptchaVerified = false;
    if (module === 'share_view' || path.startsWith('/api/share/view')) {
      if (targetShareId && this.tracking.verifiedShares && this.tracking.verifiedShares[targetShareId]) {
        const verifiedAt = this.tracking.verifiedShares[targetShareId];
        if (now - verifiedAt < 60 * 60 * 1000) {
          isCurrentCaptchaVerified = true;
        } else {
          delete this.tracking.verifiedShares[targetShareId];
        }
      }
    } else {
      isCurrentCaptchaVerified = !!this.tracking.captchaVerified;
    }

    // Se o contexto específico já resolveu a verificação de segurança, liberar acesso sem atrasos ou novo captcha
    if (isCurrentCaptchaVerified) {
      if (module !== 'share_view') {
        this.tracking.captchaRequired = false;
      }
      await this.storage.put('tracking', this.tracking);
      return new Response(
        JSON.stringify({
          blocked: false,
          captchaRequired: false,
          captchaVerified: true,
          module,
          delayMs: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Se a conexão for identificada como Tor ou Datacenter/VPN suspeita, exigir validação prévia em rotas sensíveis
    if (isSuspicious && !isCurrentCaptchaVerified) {
      if (module === 'share_view' || module === 'auth' || path.startsWith('/api/share/view')) {
        this.tracking.captchaRequired = true;
        await this.storage.put('tracking', this.tracking);
        return new Response(
          JSON.stringify({
            blocked: false,
            captchaRequired: true,
            captchaVerified: false,
            module,
            isTorOrVpn: true,
            delayMs
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (this.tracking.captchaRequired && (module === 'auth' || module === 'share_view')) {
      return new Response(
        JSON.stringify({
          blocked: false,
          captchaRequired: true,
          captchaVerified: false,
          module,
          isTorOrVpn: isSuspicious,
          delayMs
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    await this.storage.put('tracking', this.tracking);
    return new Response(
      JSON.stringify({
        blocked: false,
        captchaRequired: false,
        captchaVerified: isCurrentCaptchaVerified,
        module,
        delayMs: isCurrentCaptchaVerified ? 0 : delayMs
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  async handleRecord(body, now) {
    const { path = '', reason = '', ip = '0.0.0.0', userAgent = 'Unknown' } = body;
    this.tracking.attempts = (this.tracking.attempts || 0) + 1;
    if (!this.tracking.recentAttempts) this.tracking.recentAttempts = [];
    this.tracking.recentAttempts.push({ ip, userAgent, path, timestamp: new Date(now).toISOString(), reason });
    if (this.tracking.recentAttempts.length > 8) this.tracking.recentAttempts.shift();

    // Penalidade gradual: apenas bloqueia após 40 tentativas de ataque contínuas
    if (this.tracking.attempts >= 40) {
      if (this.tracking.blockedUntil < now) {
        this.tracking.blockedUntil = now + 5 * 60 * 1000; // 5 minutos de cooldown
      }
    } else if (this.tracking.attempts >= 15 && this.tracking.module === 'auth') {
      this.tracking.captchaRequired = true;
    }

    await this.storage.put('tracking', this.tracking);
    return new Response(
      JSON.stringify({ recorded: true, attempts: this.tracking.attempts, blocked: this.tracking.blockedUntil > now }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const now = Date.now();
    let body = {};
    if (request.method === 'POST') {
      try { body = await request.json(); } catch { body = {}; }
    }
    await this.initTracking(body, now);

    if (action === 'check') return this.handleCheck(body, now);
    if (action === 'record') return this.handleRecord(body, now);
    if (action === 'verify_captcha' || action === 'reset') {
      const targetShareId = body.shareId || url.searchParams.get('shareId');
      if (targetShareId) {
        if (!this.tracking.verifiedShares) this.tracking.verifiedShares = {};
        this.tracking.verifiedShares[targetShareId] = now;
      }
      if (body.module !== 'share_view') {
        this.tracking.captchaRequired = false;
        this.tracking.captchaVerified = true;
        this.tracking.captchaVerifiedAt = now;
      }
      this.tracking.blockedUntil = 0;
      this.tracking.attempts = 0;
      await this.storage.put('tracking', this.tracking);
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  }
}
