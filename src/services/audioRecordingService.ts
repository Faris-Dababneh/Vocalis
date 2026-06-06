import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export async function createAndStartRecording(): Promise<{
  recording: Audio.Recording;
  uri: string | null;
}> {
  await Audio.requestPermissionsAsync();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  return { recording, uri: null };
}

export async function stopAndSaveRecording(
  recording: Audio.Recording
): Promise<{ uri: string | null; duration: number }> {
  await recording.stopAndUnloadAsync();
  const status = await recording.getStatusAsync();
  const uri = recording.getURI();
  const duration = status.durationMillis ?? 0;
  return { uri, duration };
}

export async function createPlaybackSound(uri: string): Promise<Audio.Sound> {
  const { sound } = await Audio.Sound.createAsync({ uri });
  return sound;
}

export async function uploadAudioToStorage(
  uri: string,
  userId: string,
  type: string
): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('Audio upload not supported on web');
  }

  const response = await fetch(uri);
  const blob = await response.blob();
  const filename = `${type}_${Date.now()}.m4a`;
  const storageRef = ref(storage, `users/${userId}/recordings/${filename}`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
