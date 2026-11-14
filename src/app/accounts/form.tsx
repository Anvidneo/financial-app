import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import {
  DangerButton,
  FieldInput,
  FormField,
  FormGroup,
  FormHeader,
  FormScreen,
  SaveButton,
} from '@/components/form';
import { LoadFailed } from '@/components/load-failed';
import { addAccount, deleteAccount, getAccount, updateAccount } from '@/db/accounts';
import { formatCop } from '@/lib/money';
import { runAction } from '@/lib/report';
import { useLoad } from '@/lib/use-load';

export default function AccountFormScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const [name, setName] = useState('');
  const [balanceCop, setBalanceCop] = useState(0);
  const [saving, setSaving] = useState(false);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      if (id === null) return;
      const account = await getAccount(db, id);
      if (!account) return;
      setName(account.name);
      setBalanceCop(account.balanceCop);
    }, [db, id]),
    { onFocus: false },
  );

  if (failed) return <LoadFailed onRetry={retry} />;
  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (id === null) {
        await addAccount(db, name, balanceCop);
      } else {
        await updateAccount(db, id, name, balanceCop);
      }
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Account not saved', 'Nothing changed. Try saving again.');
    }
  }

  function confirmDelete() {
    if (id === null) return;
    Alert.alert(`Delete ${name}?`, 'Your expenses stay as they are.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          runAction('Account not deleted', async () => {
            await deleteAccount(db, id);
            router.back();
          }),
      },
    ]);
  }

  return (
    <FormScreen>
      <FormHeader>{id === null ? 'New account' : 'Edit account'}</FormHeader>

      <FormGroup>
        <FormField label="Name" divider>
          <FieldInput
            accessibilityLabel="Name"
            autoCapitalize="words"
            onChangeText={setName}
            placeholder="Savings account"
            value={name}
          />
        </FormField>
        <FormField label="Balance">
          <FieldInput
            accessibilityLabel="Balance"
            keyboardType="number-pad"
            onChangeText={(text) => setBalanceCop(Number(text.replace(/\D/g, '').slice(0, 12)))}
            placeholder="$0"
            value={balanceCop > 0 ? formatCop(balanceCop) : ''}
          />
        </FormField>
      </FormGroup>

      <SaveButton disabled={!canSave} label="Save account" onPress={save} />

      {id !== null && <DangerButton label="Delete account" onPress={confirmDelete} />}
    </FormScreen>
  );
}
