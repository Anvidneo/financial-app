import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';

// The building blocks every modal form shares, so each form only describes its own fields.

export function FormScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      style={styles.screen}>
      {children}
    </ScrollView>
  );
}

export function FormHeader({ children }: { children: ReactNode }) {
  return (
    <View style={styles.header}>
      <PressableScale
        accessibilityLabel="Close"
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.close}>
        <SymbolView name="xmark" size={16} tintColor={colors.ink} />
      </PressableScale>
      {typeof children === 'string' ? (
        <Text accessibilityRole="header" style={styles.title}>
          {children}
        </Text>
      ) : (
        children
      )}
      <View style={styles.close} />
    </View>
  );
}

export function FormGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export function FormField({
  label,
  divider = false,
  children,
}: {
  label: string;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.field, divider && styles.divider]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export function FieldInput(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />;
}

export function DayStepper({
  label,
  value,
  onPrevious,
  onNext,
}: {
  label: string;
  value: string;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <FormField label={label}>
      <View style={styles.stepper}>
        <StepButton
          icon="chevron.left"
          label={`Previous ${label.toLowerCase()}`}
          onPress={onPrevious}
        />
        <Text style={styles.stepValue}>{value}</Text>
        <StepButton icon="chevron.right" label={`Next ${label.toLowerCase()}`} onPress={onNext} />
      </View>
    </FormField>
  );
}

function StepButton({
  icon,
  label,
  onPress,
}: {
  icon: 'chevron.left' | 'chevron.right';
  label: string;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={styles.stepButton}>
      <SymbolView name={icon} size={14} tintColor={onPress ? colors.muted : colors.control} />
    </PressableScale>
  );
}

export function SaveButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.save, disabled && styles.saveDisabled]}>
      <Text style={[styles.saveLabel, disabled && styles.saveLabelDisabled]}>{label}</Text>
    </PressableScale>
  );
}

export function DangerButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.danger}>
      <Text style={styles.dangerLabel}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
  },
  input: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    minHeight: 48,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -14,
  },
  stepValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    minWidth: 76,
    textAlign: 'center',
  },
  stepButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    height: 56,
    borderRadius: radius.card,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: {
    backgroundColor: colors.control,
  },
  saveLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  saveLabelDisabled: {
    color: colors.muted,
  },
  danger: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
});
