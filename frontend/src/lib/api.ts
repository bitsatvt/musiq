import type { AuthUser } from './auth';

const BASE_URL = 'http://localhost:5000';

export type Instrument = {
  instrument_id: number;
  name: string;
};

export type StaffPlacementQuestion = {
  id: string;
  display_name: string;
  letter: string;
  octave: number;
  staff: 'treble' | 'bass';
  position_id: string;
  hint: string;
};

export type StaffPlacementPosition = {
  id: string;
  label: string;
  kind: 'line' | 'space';
  note: string;
  clef: 'treble' | 'bass';
  index: number;
};

export type StaffPlacementSession = {
  quiz_id: string;
  instrument: {
    name: string;
    staff_type: 'single' | 'grand';
    clefs: string;
    range: string;
    notation_note: string;
  };
  questions: StaffPlacementQuestion[];
  positions: StaffPlacementPosition[];
};

export type StaffPlacementValidation = {
  correct: boolean;
  selected_note: string;
  correct_note: string;
  feedback: string;
};

// Public endpoint: instrument choices are needed before an account exists.
export async function getInstruments(signal?: AbortSignal): Promise<Instrument[]> {
  const response = await fetch(`${BASE_URL}/instruments`, { signal });
  if (!response.ok) throw new Error('Unable to load instruments. Please try again.');
  const data = await response.json();
  if (!Array.isArray(data.Instruments) || data.Instruments.length === 0) {
    throw new Error('No instruments are available. Please try again later.');
  }
  if (!data.Instruments.every((item: Instrument) =>
    item && Number.isSafeInteger(item.instrument_id) && item.instrument_id > 0 &&
    typeof item.name === 'string' && item.name.trim().length > 0
  )) {
    throw new Error('Unable to load instruments. Please try again.');
  }
  return data.Instruments;
}

export async function startStaffPlacementQuiz(instrumentName: string): Promise<StaffPlacementSession> {
  const response = await fetch(`${BASE_URL}/staff-placement/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instrument_name: instrumentName }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.Error || 'Unable to start the staff placement quiz.');
  return data as StaffPlacementSession;
}

export async function validateStaffPlacement(
  quizId: string,
  questionId: string,
  positionId: string,
): Promise<StaffPlacementValidation> {
  const response = await fetch(`${BASE_URL}/staff-placement/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quiz_id: quizId, question_id: questionId, position_id: positionId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.Error || 'Unable to validate the placement.');
  return data as StaffPlacementValidation;
}

function getToken() {
  return localStorage.getItem('authToken');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.Error || 'Request failed');
  return data;
}

// Read the saved profile instead of relying on potentially stale browser storage.
export async function getProfile(signal?: AbortSignal): Promise<AuthUser> {
  if (!getToken()) throw new Error('Please log in to edit your instruments.');
  const data = await request('/users/profile', { signal, cache: 'no-store' });
  return data.User as AuthUser;
}

export async function updateInstruments(instrumentIds: number[], signal?: AbortSignal): Promise<AuthUser> {
  if (!getToken()) throw new Error('Please log in to edit your instruments.');
  const data = await request('/users/update_instruments', {
    method: 'POST',
    body: JSON.stringify({ instrument_ids: instrumentIds }),
    signal,
  });
  return data.User as AuthUser;
}

// ─── Auth (called by login/signup pages) ──────────────────────────────────────
// POST /users/login    → { Message, Token, User: { user_id, username } }
// POST /users/signup   → { Message, Token, User: { user_id, username } }
// Token must be saved to localStorage as 'token' after login/signup:
//   localStorage.setItem('token', data.Token)

// ─── Friends ──────────────────────────────────────────────────────────────────

// GET /friends/friends_list
// → { Message, Friends: [{ user_id, username }] }
export async function getFriends() {
  const data = await request('/friends/friends_list');
  return (data.Friends ?? []) as { user_id: number; username: string }[];
}

// GET /friends/incoming_pending_requests
// → { Message, Requests: { incoming: [{ user_id, username }] } }
export async function getIncomingRequests() {
  const data = await request('/friends/incoming_pending_requests');
  return (data.Requests?.incoming ?? []) as { user_id: number; username: string }[];
}

// GET /friends/outgoing_pending_requests
// → { Message, Requests: { outgoing: [{ user_id, username }] } }
export async function getOutgoingRequests() {
  const data = await request('/friends/outgoing_pending_requests');
  return (data.Requests?.outgoing ?? []) as { user_id: number; username: string }[];
}

// POST /friends/friend_request  body: { receiver_id }
export async function sendFriendRequest(receiver_id: number) {
  return request('/friends/friend_request', {
    method: 'POST',
    body: JSON.stringify({ receiver_id }),
  });
}

// POST /friends/accept_request  body: { requester_id }
export async function acceptFriendRequest(requester_id: number) {
  return request('/friends/accept_request', {
    method: 'POST',
    body: JSON.stringify({ requester_id }),
  });
}

// POST /friends/decline_request  body: { requester_id }
export async function declineFriendRequest(requester_id: number) {
  return request('/friends/decline_request', {
    method: 'POST',
    body: JSON.stringify({ requester_id }),
  });
}

// DELETE /friends/cancel_request  body: { receiver_id }
// Used for cancelling an outgoing request (not the same as decline)
export async function cancelFriendRequest(receiver_id: number) {
  return request('/friends/cancel_request', {
    method: 'DELETE',
    body: JSON.stringify({ receiver_id }),
  });
}

// DELETE /friends/remove_friend  body: { friend_id }
export async function removeFriend(friend_id: number) {
  return request('/friends/remove_friend', {
    method: 'DELETE',
    body: JSON.stringify({ friend_id }),
  });
}

// GET /friends/friend_status/:other_id
// → { Message, Status: 'friends' | 'request_sent' | 'request_received' | 'none' }
export async function getFriendStatus(other_id: number) {
  const data = await request(`/friends/friend_status/${other_id}`);
  return data.Status as 'friends' | 'request_sent' | 'request_received' | 'none';
}

// ─── Users ────────────────────────────────────────────────────────────────────

// GET /users/get_users
// → { Message, Users: [{ user_id, username }] }
// TODO: Replace with a proper search endpoint once added to users.py
//       e.g. GET /users/search?username=query → { users: [{ user_id, username }] }
export async function searchUsers(username: string) {
  const data = await request('/users/get_users');
  const all = (data.Users ?? []) as { user_id: number; username: string }[];
  // Client-side filter until a real search endpoint exists
  return all.filter((u) =>
    u.username.toLowerCase().includes(username.toLowerCase())
  );
}
