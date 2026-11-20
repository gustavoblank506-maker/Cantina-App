import { useState } from 'react';
import { Text, View } from 'react-native';
import { money } from '../format';
import { styles } from '../theme';
import type { Announcement, MenuItem, Report } from '../types';
import { Tap } from './motion';
import { PrimaryButton, SecondaryButton, TextField } from './ui';

/** "7,50" ou "R$ 7.50" → 750 centavos. Devolve null se não for um preço. */
export function parsePrice(text: string) {
  const value = Number(text.replace(/R\$|\s/g, '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}
const priceText = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

type SaveItem = (name: string, priceCents: number) => Promise<boolean>;

/** Nome e preço de um item: serve para criar e para editar. */
function ItemForm({
  item,
  onSave,
  onCancel,
  onError,
}: {
  item?: MenuItem;
  onSave: SaveItem;
  onCancel?: () => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? priceText(item.priceCents) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const priceCents = parsePrice(price);
    if (name.trim().length < 2) return onError('Informe o nome do item.');
    if (priceCents === null) return onError('Informe o preço, por exemplo 4,50.');
    setSaving(true);
    const saved = await onSave(name.trim(), priceCents);
    setSaving(false);
    if (saved && !item) {
      setName('');
      setPrice('');
    }
  };

  return (
    <View style={styles.itemForm}>
      <View style={{ flex: 2, minWidth: 160 }}>
        <TextField label="Nome do item" value={name} onChangeText={setName} maxLength={40} />
      </View>
      <View style={{ flex: 1, minWidth: 110 }}>
        <TextField label="Preço (R$)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" maxLength={10} onSubmitEditing={save} />
      </View>
      <View style={styles.itemFormActions}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label={saving ? 'Salvando…' : item ? 'Salvar' : 'Adicionar'} onPress={save} disabled={saving} />
        </View>
        {onCancel && (
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Cancelar" onPress={onCancel} />
          </View>
        )}
      </View>
    </View>
  );
}

/** Cardápio da atendente: adicionar item, mudar nome e preço, marcar como esgotado. */
export function MenuEditor({
  menu,
  onCreate,
  onUpdate,
  onError,
}: {
  menu: MenuItem[];
  onCreate: SaveItem;
  onUpdate: (item: MenuItem, changes: Partial<MenuItem>) => Promise<boolean>;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text style={styles.sectionLabel}>Novo item</Text>
        <ItemForm onSave={onCreate} onError={onError} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={styles.sectionLabel}>Itens ({menu.length})</Text>
        <Text style={styles.caption}>Preço novo vale só para pedidos novos. Item esgotado some do cardápio do aluno.</Text>
        {menu.map((item) =>
          editing === item.id ? (
            <View key={item.id} style={styles.reviewCard}>
              <ItemForm
                item={item}
                onError={onError}
                onCancel={() => setEditing(null)}
                onSave={async (name, priceCents) => {
                  const saved = await onUpdate(item, { name, priceCents });
                  if (saved) setEditing(null);
                  return saved;
                }}
              />
            </View>
          ) : (
            <View key={item.id} style={styles.menuRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{money(item.priceCents)}</Text>
              </View>
              <Tap
                accessibilityRole="switch"
                accessibilityLabel={`${item.name} disponível`}
                accessibilityState={{ checked: item.available }}
                onPress={() => onUpdate(item, { available: !item.available })}
                style={[styles.statusRow, styles.availability, !item.available && styles.selected]}
              >
                <Text style={[styles.statusText, !item.available && styles.selectedText]}>
                  {item.available ? 'Disponível' : 'Esgotado'}
                </Text>
              </Tap>
              <Tap accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`} onPress={() => setEditing(item.id)}>
                <Text style={styles.remove}>Editar</Text>
              </Tap>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

/** Faixa com o aviso da cantina. Aparece no app do aluno e como prévia para a atendente. */
export function AnnouncementBanner({ announcement }: { announcement: Announcement | null }) {
  if (!announcement) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.announcement}>
      <Text style={styles.announcementLabel}>Aviso da cantina</Text>
      <Text style={styles.announcementText}>{announcement.text}</Text>
    </View>
  );
}

/** A atendente escreve, publica ou apaga o aviso que os alunos veem no topo do app. */
export function AnnouncementEditor({
  announcement,
  onSave,
}: {
  announcement: Announcement | null;
  onSave: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState(announcement?.text ?? '');
  const [saving, setSaving] = useState(false);
  const save = async (value: string) => {
    setSaving(true);
    const saved = await onSave(value);
    setSaving(false);
    if (saved && !value) setText('');
  };

  return (
    <View style={{ gap: 16 }}>
      <Text style={styles.caption}>
        Os alunos veem o aviso no topo do app, por exemplo: "Hoje não tem coxinha" ou "A cantina fecha às 20h". Para avisar
        que um pedido está pronto, use a situação Pronto na aba Pedidos.
      </Text>
      <TextField
        label={`Aviso (${text.length}/200)`}
        value={text}
        onChangeText={setText}
        maxLength={200}
        multiline
        style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
      />
      <View style={styles.itemFormActions}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label={saving ? 'Salvando…' : 'Publicar aviso'} onPress={() => save(text)} disabled={saving || !text.trim()} />
        </View>
        {announcement && (
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Apagar aviso" onPress={() => save('')} disabled={saving} />
          </View>
        )}
      </View>
      <View style={{ gap: 8 }}>
        <Text style={styles.sectionLabel}>Como os alunos estão vendo agora</Text>
        {announcement ? <AnnouncementBanner announcement={announcement} /> : <Text style={styles.empty}>Nenhum aviso publicado.</Text>}
      </View>
    </View>
  );
}

/** Resumo do dia: quantos pedidos, quanto entrou, de qual turno vieram e o que mais saiu. */
export function DailyReport({ report }: { report: Report | null }) {
  if (!report) return <Text style={styles.caption}>Carregando…</Text>;
  const stats = [
    { label: 'Pedidos hoje', value: String(report.orders) },
    { label: 'Em andamento', value: String(report.open) },
    { label: 'Entregues', value: String(report.delivered) },
    { label: 'Cancelados', value: String(report.cancelled) },
    { label: 'Faturamento', value: money(report.revenueCents) },
  ];

  return (
    <View style={{ gap: 20 }}>
      <View style={styles.statGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>Faturamento conta só pedidos entregues, porque o pagamento é feito na retirada.</Text>
      <View style={styles.split}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.sectionLabel}>Pedidos por turno</Text>
          {report.byShift.length === 0 && <Text style={styles.empty}>Nenhum pedido hoje.</Text>}
          {report.byShift.map((row) => (
            <View key={row.shift} style={styles.totalRow}>
              <Text style={styles.itemName}>{row.shift}</Text>
              <Text style={styles.itemName}>{row.orders}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.sectionLabel}>Mais pedidos</Text>
          {report.topItems.length === 0 && <Text style={styles.empty}>Nenhum item vendido hoje.</Text>}
          {report.topItems.map((row) => (
            <View key={row.name} style={styles.totalRow}>
              <Text style={styles.itemName}>{row.name}</Text>
              <Text style={styles.itemName}>{row.quantity}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
