import { useState, type ComponentProps, type ReactNode } from 'react';
import { Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { firstName } from '../format';
import { colors, styles } from '../theme';
import type { Notice, User } from '../types';
import { Shake, Tap } from './motion';

type ButtonProps = { label: string; onPress: () => void; disabled?: boolean };

export function PrimaryButton({ label, onPress, disabled = false }: ButtonProps) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Tap>
  );
}

export function SecondaryButton({ label, onPress, disabled = false }: ButtonProps) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.secondaryButton, disabled && styles.disabled]}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Tap>
  );
}

export function RoundButton({ label, name, onPress }: { label: string; name: string; onPress: () => void }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={styles.roundButton}>
      <Text style={styles.roundText}>{label}</Text>
    </Tap>
  );
}

export function NoticeBox({ notice }: { notice: Notice }) {
  if (!notice.message) return null;
  return (
    <Shake key={notice.attempt}>
      <Text accessibilityRole="alert" style={styles.errorBox}>
        {notice.message}
      </Text>
    </Shake>
  );
}

export function QuantityControl({ item, quantity, onChange }: { item: string; quantity: number; onChange: (delta: number) => void }) {
  return (
    <View style={styles.quantity}>
      <RoundButton label="−" name={`Diminuir ${item}`} onPress={() => onChange(-1)} />
      <Text style={styles.quantityText}>{quantity}</Text>
      <RoundButton label="+" name={`Aumentar ${item}`} onPress={() => onChange(1)} />
    </View>
  );
}

export function TextField({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

/** Campo de escolha numa lista. O React Native não tem um <select>, então a lista abre logo abaixo do campo. */
export function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.selectBox}
      >
        <Text style={[styles.selectText, !value && styles.selectPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={styles.selectArrow}>{open ? '▴' : '▾'}</Text>
      </Tap>
      {open && (
        <View accessibilityRole="radiogroup" style={styles.selectList}>
          {options.map((option) => {
            const selected = option === value;
            return (
              <Tap
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={[styles.selectOption, selected && styles.selectOptionSelected]}
              >
                <Text style={[styles.selectOptionText, selected && styles.selectedText]}>{option}</Text>
              </Tap>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Opções em pílulas. "tabs" troca de tela; "radio" é uma escolha de formulário. */
export function Switcher<T extends string>({
  options,
  value,
  onChange,
  kind = 'tabs',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  kind?: 'tabs' | 'radio';
}) {
  const radio = kind === 'radio';
  return (
    <View accessibilityRole={radio ? 'radiogroup' : 'tablist'} style={styles.switcher}>
      {options.map((option) => (
        <Tap
          key={option.value}
          accessibilityRole={radio ? 'radio' : 'tab'}
          accessibilityState={radio ? { checked: value === option.value } : { selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={[styles.switchOption, value === option.value && styles.switchSelected]}
        >
          <Text style={[styles.switchText, value === option.value && styles.switchTextSelected]}>{option.label}</Text>
        </Tap>
      ))}
    </View>
  );
}

/** Moldura de conteúdo do layout de computador. */
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

/** Barra do topo no computador. */
export function TopBar({
  user,
  subtitle,
  onLogout,
  children,
}: {
  user: User;
  subtitle?: string;
  onLogout: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBrandRow}>
        <Text style={styles.topBrand}>Cantina</Text>
        {subtitle && <Text style={styles.caption}>{subtitle}</Text>}
      </View>
      <View style={styles.topActions}>
        {children}
        <Text style={styles.caption}>Olá, {firstName(user.name)}</Text>
        <Tap accessibilityRole="button" onPress={onLogout}>
          <Text style={styles.link}>Sair</Text>
        </Tap>
      </View>
    </View>
  );
}

/** Cabeçalho dentro da moldura de celular. */
export function Header({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.caption}>Olá, {firstName(user.name)}</Text>
      <Tap accessibilityRole="button" onPress={onLogout}>
        <Text style={styles.link}>Sair</Text>
      </Tap>
    </View>
  );
}
