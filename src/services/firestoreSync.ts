import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { auth } from './auth';
import { CalendarEvent } from '../types/calendar';

const db = getFirestore(auth.app);

/**
 * Sets up a real-time listener for the authenticated user's calendar events.
 */
export function subscribeUserEvents(
  userId: string,
  onSync: (events: CalendarEvent[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const eventsCol = collection(db, 'users', userId, 'events');

  return onSnapshot(
    eventsCol,
    (snapshot) => {
      const remoteEvents: CalendarEvent[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CalendarEvent;
        remoteEvents.push({ ...data, id: docSnap.id });
      });
      onSync(remoteEvents);
    },
    (err) => {
      console.warn('Firestore sync snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Saves or updates a single event to Firestore.
 */
export async function saveEventToFirestore(
  userId: string,
  event: CalendarEvent
): Promise<void> {
  const eventRef = doc(db, 'users', userId, 'events', event.id);
  await setDoc(eventRef, { ...event, updatedAt: Date.now() }, { merge: true });
}

/**
 * Deletes an event from Firestore.
 */
export async function deleteEventFromFirestore(
  userId: string,
  eventId: string
): Promise<void> {
  const eventRef = doc(db, 'users', userId, 'events', eventId);
  await deleteDoc(eventRef);
}

/**
 * Uploads a batch of events to Firestore (initial full sync).
 */
export async function batchUploadEvents(
  userId: string,
  events: CalendarEvent[]
): Promise<number> {
  const batch = writeBatch(db);
  let count = 0;

  for (const ev of events) {
    const eventRef = doc(db, 'users', userId, 'events', ev.id);
    batch.set(eventRef, { ...ev, updatedAt: Date.now() }, { merge: true });
    count++;
  }

  await batch.commit();
  return count;
}
