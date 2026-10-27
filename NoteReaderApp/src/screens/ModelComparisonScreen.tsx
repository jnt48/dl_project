// ─────────────────────────────────────────────────────────────────────────────
// screens/ModelComparisonScreen.tsx
//
// Sighted helper screen showing the full model comparison table (P7 results).
// Data is hard-coded here as a placeholder; replace with actual experiment
// values from results/model_comparison_table.csv after training.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

interface ModelRow {
  name: string;
  testAcc: string;
  params: string;
  sizeMB: string;
  inferMs: string;
  pretrained: string;
  chosen?: boolean;
}

// ⚠️ REPLACE these values with actual results from your training run.
// The structure matches results/model_comparison_table.csv
const MODEL_TABLE: ModelRow[] = [
  { name: 'CNN Scratch',  testAcc: '—',  params: '~5M',  sizeMB: '~20',  inferMs: '~80',  pretrained: 'No' },
  { name: 'VGG16',        testAcc: '—',  params: '138M', sizeMB: '~528', inferMs: '—',    pretrained: 'ImageNet' },
  { name: 'ResNet50',     testAcc: '—',  params: '25M',  sizeMB: '~98',  inferMs: '—',    pretrained: 'ImageNet' },
  { name: 'InceptionV3',  testAcc: '—',  params: '23M',  sizeMB: '~92',  inferMs: '—',    pretrained: 'ImageNet' },
  { name: 'MobileNetV2',  testAcc: '—',  params: '3.4M', sizeMB: '~14',  inferMs: '~50',  pretrained: 'ImageNet', chosen: true },
  { name: 'MNV2 INT8 TFLite', testAcc: '—', params: '3.4M', sizeMB: '~4', inferMs: '~20', pretrained: 'ImageNet' },
];

const OPTIMIZER_TABLE = [
  { name: 'SGD',       note: 'Slowest; stable with small LR' },
  { name: 'Momentum',  note: 'Faster; can overshoot' },
  { name: 'Nesterov',  note: 'Lookahead correction; slightly better' },
  { name: 'Adagrad',   note: 'Adaptive LR; good for sparse data' },
  { name: 'RMSProp',   note: 'Stable; good for non-stationary problems' },
  { name: 'Adam ✓',    note: 'Best: combines Momentum + RMSProp' },
];

const REG_TABLE = [
  { name: 'None',            note: 'Overfits quickly on small dataset' },
  { name: 'L1 (λ=0.001)',    note: 'Sparse; may zero useful features' },
  { name: 'L2 (λ=0.001)',    note: 'Smooth shrinkage; good balance' },
  { name: 'Dropout 0.3',     note: 'Prevents co-adaptation; robust' },
  { name: 'L2+Dropout+ES ✓', note: 'Best: small gap, early stopping' },
];

export function ModelComparisonScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">Model Comparison</Text>
      <Text style={styles.note}>
        ⚠ Replace "—" with actual values after running the notebooks.
      </Text>

      {/* ── P7 Model comparison ──────────────────────────────────────────── */}
      <Text style={styles.sectionTitle} accessibilityRole="header">P7 – Transfer Learning</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View>
          <TableRow
            cells={['Model', 'Acc%', 'Params', 'MB', 'ms', 'Pretrained']}
            header
          />
          {MODEL_TABLE.map((r) => (
            <TableRow
              key={r.name}
              cells={[r.name, r.testAcc, r.params, r.sizeMB, r.inferMs, r.pretrained]}
              highlight={r.chosen}
            />
          ))}
        </View>
      </ScrollView>

      {/* ── P4 Optimizer summary ─────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { marginTop: 32 }]} accessibilityRole="header">
        P4 – Optimizers (ranked worst → best)
      </Text>
      {OPTIMIZER_TABLE.map((r) => (
        <View key={r.name} style={[styles.listRow, r.name.includes('✓') && styles.highlight]}>
          <Text style={styles.listName}>{r.name}</Text>
          <Text style={styles.listNote}>{r.note}</Text>
        </View>
      ))}

      {/* ── P5 Regulariser summary ───────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { marginTop: 32 }]} accessibilityRole="header">
        P5 – Regularizers (ranked worst → best)
      </Text>
      {REG_TABLE.map((r) => (
        <View key={r.name} style={[styles.listRow, r.name.includes('✓') && styles.highlight]}>
          <Text style={styles.listName}>{r.name}</Text>
          <Text style={styles.listNote}>{r.note}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function TableRow({
  cells, header, highlight,
}: { cells: string[]; header?: boolean; highlight?: boolean }) {
  return (
    <View style={[styles.tableRow, header && styles.tableHeader, highlight && styles.highlightRow]}>
      {cells.map((c, i) => (
        <Text
          key={i}
          style={[
            styles.tableCell,
            header && styles.tableCellHeader,
            i === 0 && { width: 140 },
          ]}
          numberOfLines={1}
        >
          {c}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 60 },
  heading: { color: '#FFD700', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  note: { color: '#f97316', fontSize: 13, marginBottom: 20 },
  sectionTitle: { color: '#FFD700', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  tableRow: {
    flexDirection: 'row', backgroundColor: '#1a1a1a',
    marginBottom: 2, borderRadius: 6, overflow: 'hidden',
  },
  tableHeader: { backgroundColor: '#2a2a2a' },
  highlightRow: { borderWidth: 1.5, borderColor: '#FFD700' },
  tableCell: {
    color: '#ddd', fontSize: 12, width: 70, padding: 10, textAlign: 'center',
  },
  tableCellHeader: { color: '#FFD700', fontWeight: '700' },
  listRow: {
    flexDirection: 'row', backgroundColor: '#1a1a1a',
    borderRadius: 8, padding: 12, marginBottom: 6, gap: 12,
    alignItems: 'center',
  },
  highlight: { borderWidth: 1.5, borderColor: '#FFD700', backgroundColor: '#2a2400' },
  listName: { color: '#FFD700', fontWeight: '700', fontSize: 14, width: 160 },
  listNote: { color: '#ccc', fontSize: 13, flex: 1 },
});
