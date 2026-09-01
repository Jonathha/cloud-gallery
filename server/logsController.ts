import { Request, Response } from 'express';

const LOGS_PROJECT_ID = "logspupurim";
const LOGS_API_KEY = "AIzaSyCLslHMzo7LjEJn2fhr5oWhmrB6F-gwUVU";
const PRIMARY_FIREBASE_API_KEY = "AIzaSyB66ZqvvC3-TZoqvOUqPusY2IGMitx5ZS8";

const DEFAULT_ADMIN_EMAILS = [
  "jogonesteterp@gmail.com",
  "matheusvitoor2026@gmail.com",
  "admin@jogonesteterp.com"
];

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminList = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const allAdmins = [...adminList, ...DEFAULT_ADMIN_EMAILS];
  return allAdmins.includes(email.toLowerCase());
}

async function verifyFirebaseIdToken(idToken: string) {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${PRIMARY_FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.users && json.users.length > 0) {
      const u = json.users[0];
      return {
        uid: u.localId,
        email: u.email || null,
        displayName: u.displayName || null
      };
    }
  } catch (err) {
    console.error('[ServerLogs] Erro ao validar token do Firebase Auth:', err);
  }
  return null;
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function parseFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return {};
  const id = doc.name ? doc.name.split('/').pop() : undefined;
  const data: Record<string, any> = { id };
  for (const [k, v] of Object.entries(doc.fields)) {
    data[k] = fromFirestoreValue(v);
  }
  return data;
}

async function writeLogsDocREST(collectionId: string, data: Record<string, any>, documentId: string | null = null) {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) {
      fields[k] = toFirestoreValue(v);
    }
  }

  let url: string;
  let method: string;

  if (documentId) {
    url = `https://firestore.googleapis.com/v1/projects/${LOGS_PROJECT_ID}/databases/(default)/documents/${collectionId}/${documentId}?key=${LOGS_API_KEY}`;
    method = 'PATCH';
  } else {
    url = `https://firestore.googleapis.com/v1/projects/${LOGS_PROJECT_ID}/databases/(default)/documents/${collectionId}?key=${LOGS_API_KEY}`;
    method = 'POST';
  }

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[ServerLogs] Erro na escrita do Firestore REST para ${collectionId}:`, errText);
    return false;
  }

  return true;
}

export async function listLogsDocREST(collectionId: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${LOGS_PROJECT_ID}/databases/(default)/documents/${collectionId}?key=${LOGS_API_KEY}&pageSize=300`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`[ServerLogs] Erro ao listar ${collectionId}:`, await response.text());
    return [];
  }
  const json = await response.json();
  const documents = json.documents || [];
  return documents.map(parseFirestoreDoc);
}

export async function handleFetchLogsExpress(req: Request, res: Response) {
  try {
    const collectionId = req.query.collection as string;
    if (!collectionId || !['user_accesses', 'audit_logs', 'security_events'].includes(collectionId)) {
      return res.status(400).json({ success: false, error: 'Coleção inválida.' });
    }

    let idToken: string | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.substring(7).trim();
    }
    const verifiedUser = idToken ? await verifyFirebaseIdToken(idToken) : null;
    if (!verifiedUser) {
      return res.status(401).json({ success: false, error: 'Não autorizado: token de autenticação ausente ou inválido.' });
    }

    if (!isUserAdmin(verifiedUser.email)) {
      return res.status(403).json({ success: false, error: 'Acesso negado: privilégios de administrador necessários.' });
    }

    const records = await listLogsDocREST(collectionId);
    return res.json({ success: true, records, verifiedUser: verifiedUser.email });
  } catch (err: any) {
    console.error('[ServerLogs] Erro ao buscar logs:', err);
    return res.json({ success: false, records: [] });
  }
}

export async function handleRecordLogExpress(req: Request, res: Response) {
  try {
    const body = req.body || {};
    let ip = '0.0.0.0';
    const forwarded = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'];
    if (forwarded) {
      const ipStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      ip = ipStr.split(',')[0].trim();
    } else {
      ip = req.socket.remoteAddress || req.ip || '0.0.0.0';
    }
    const userAgent = (req.headers['user-agent'] as string) || '';
    const { logType, data } = body;

    if (!logType || !data) {
      return res.status(400).json({ success: false, error: 'Parâmetros inválidos.' });
    }

    let idToken: string | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.substring(7).trim();
    } else if (body.idToken) {
      idToken = body.idToken;
    }

    const verifiedUser = idToken ? await verifyFirebaseIdToken(idToken) : null;
    const timestamp = Date.now();

    if (logType === 'user_access') {
      let uid: string;
      let email: string;
      let displayName: string;
      let isAnon: boolean;

      if (verifiedUser) {
        uid = verifiedUser.uid;
        email = verifiedUser.email || 'Usuário Sem E-mail';
        displayName = verifiedUser.displayName || (email.includes('@') ? email.split('@')[0] : 'Usuário');
        isAnon = false;
      } else {
        uid = 'anonymous';
        email = 'Anônimo';
        displayName = 'Visitante Anônimo';
        isAnon = true;
      }

      const timeZone = data.timeZone || 'UTC';
      const docId = uid.replace(/[^a-zA-Z0-9_-]/g, '_');

      await writeLogsDocREST('user_accesses', {
        uid,
        email,
        displayName,
        lastAccess: timestamp,
        firstAccess: data.firstAccess || timestamp,
        accessCount: (data.accessCount || 1),
        timeZone,
        ip,
        userAgent,
        anonymous: isAnon
      }, docId);

      return res.json({ success: true, verified: !!verifiedUser, anonymous: isAnon });
    }

    if (logType === 'audit') {
      let userId: string;
      let userEmail: string;
      let adminUid: string;
      let adminEmail: string | null;
      let isAnon: boolean;

      if (verifiedUser) {
        userId = verifiedUser.uid;
        userEmail = verifiedUser.email || 'Usuário Sem E-mail';
        adminUid = verifiedUser.uid;
        adminEmail = verifiedUser.email || 'Usuário Sem E-mail';
        isAnon = false;
      } else {
        userId = 'anonymous';
        userEmail = 'Anônimo';
        adminUid = 'anonymous';
        adminEmail = null;
        isAnon = true;
      }

      await writeLogsDocREST('audit_logs', {
        type: data.type || 'system_entry',
        userId,
        userEmail,
        adminUid,
        adminEmail,
        timestamp: data.timestamp || timestamp,
        details: data.details || '',
        ip,
        anonymous: isAnon
      });

      return res.json({ success: true, verified: !!verifiedUser, anonymous: isAnon });
    }

    if (logType === 'security') {
      let userId: string;
      let userEmail: string;
      let isAnon: boolean;

      if (verifiedUser) {
        userId = verifiedUser.uid;
        userEmail = verifiedUser.email || 'Usuário Sem E-mail';
        isAnon = false;
      } else {
        userId = 'anonymous';
        userEmail = 'Anônimo';
        isAnon = true;
      }

      await writeLogsDocREST('security_events', {
        type: data.type || 'unauthorized_access',
        module: data.module || 'system',
        timestamp: data.timestamp || timestamp,
        userId,
        userEmail,
        reason: data.reason || 'Evento de segurança',
        path: data.path || '',
        ip: data.ip || ip,
        userAgent,
        anonymous: isAnon
      });

      return res.json({ success: true, verified: !!verifiedUser, anonymous: isAnon });
    }

    return res.status(400).json({ success: false, error: 'Tipo de log inválido.' });
  } catch (err: any) {
    console.error('[ServerLogs] Erro interno:', err);
    return res.status(500).json({ success: false, error: 'Erro interno ao salvar log.' });
  }
}
