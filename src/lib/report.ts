import { Alert } from 'react-native';

// For work started from a tap or a background sync: the failure is shown instead of lost.
export function reportFailure(title: string) {
  return (error: unknown) => {
    console.warn(title, error);
    Alert.alert(title, error instanceof Error ? error.message : 'Nothing changed. Try again.');
  };
}

// Starts an action from a tap and shows its failure, since nothing awaits a tap.
export function runAction(title: string, task: () => Promise<void>): void {
  task().catch(reportFailure(title));
}
