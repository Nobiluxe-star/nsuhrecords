export function playAlertSound(type = "update") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const notes =
      type === "announcement"
        ? [
            { freq: 659.25, delay: 0, duration: 0.11 },     // E5
            { freq: 880.0, delay: 0.10, duration: 0.11 },    // A5
            { freq: 1046.5, delay: 0.20, duration: 0.18 },   // C6
          ]
        : [
            { freq: 523.25, delay: 0, duration: 0.08 },     // C5
            { freq: 659.25, delay: 0.08, duration: 0.08 },   // E5
            { freq: 783.99, delay: 0.16, duration: 0.08 },   // G5
            { freq: 1046.5, delay: 0.24, duration: 0.18 },   // C6
          ];

    const now = ctx.currentTime;

    notes.forEach(({ freq, delay, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.02);
    });
  } catch (err) {
    // Browsers block audio until the user interacts once with the page
  }
}

export function playTimetableUpdateSound() {
  playAlertSound("update");
}

export function playAnnouncementSound() {
  playAlertSound("announcement");
}

export function buildScheduleChangeMessage(oldSchedules = {}, newSchedules = {}) {
  const prev = oldSchedules && typeof oldSchedules === "object" ? oldSchedules : {};
  const next = newSchedules && typeof newSchedules === "object" ? newSchedules : {};

  const prevSubjects = Object.keys(prev);
  const nextSubjects = Object.keys(next);

  const addedSubjects = nextSubjects.filter((subj) => !prevSubjects.includes(subj));
  if (addedSubjects.length === 1) {
    return `A subject has been added to your schedule: ${addedSubjects[0]}.`;
  }
  if (addedSubjects.length > 1) {
    return `New subjects have been added to your schedule: ${addedSubjects.join(", ")}.`;
  }

  const removedSubjects = prevSubjects.filter((subj) => !nextSubjects.includes(subj));
  if (removedSubjects.length === 1) {
    return `A subject was removed from your schedule: ${removedSubjects[0]}.`;
  }
  if (removedSubjects.length > 1) {
    return `Subjects were removed from your schedule: ${removedSubjects.join(", ")}.`;
  }

  for (const subj of nextSubjects) {
    const a = JSON.stringify(prev[subj] || []);
    const b = JSON.stringify(next[subj] || []);
    if (a !== b) {
      return `Your schedule or time allocation was updated for ${subj}.`;
    }
  }

  return "Your teacher schedule or profile was just updated.";
}
export async function requestAlertPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return await Notification.requestPermission();
}

export function showSystemAlertNotification(title, body, icon = "/icon-192x192.png") {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon });
  } catch (e) {}
}