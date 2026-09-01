import { User } from 'firebase/auth';
import { authPrimary } from '../../firebase';

export function getRealFirebaseUser(contextUser: any): User | null {
  if (authPrimary.currentUser && typeof authPrimary.currentUser.getIdToken === 'function') {
    return authPrimary.currentUser;
  }
  if (contextUser && typeof contextUser.getIdToken === 'function') {
    return contextUser as User;
  }
  return null;
}
