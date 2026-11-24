// TransactionReviewScreen – shows transactions needing manual review
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, StyleSheet, RefreshControl } from 'react-native';
import { api } from '../api';
import { formatCurrency } from '../theme';
import { Check } from 'lucide-react-native';

export default function TransactionReviewScreen({ theme, navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [rememberMap, setRememberMap] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchUncategorized = async () => {
    try {
      const data = await api.getUncategorized();
      setTransactions(data);
    } catch (e) {
      console.warn('Failed to fetch uncategorized', e);
    }
  };

  useEffect(() => {
    fetchUncategorized();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUncategorized();
    setRefreshing(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleRemember = (id) => {
    setRememberMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const applyCategory = async (categoryId) => {
    if (selectedIds.length === 0) return;
    await api.bulkCategorize({ transactionIds: selectedIds, categoryId, remember: true });
    await fetchUncategorized();
    setSelectedIds([]);
  };

  const renderItem = ({ item }) => {
    const selected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity onPress={() => toggleSelect(item.id)} style={[styles.row, selected && { backgroundColor: theme.surfaceVariant }] }>
        <View style={styles.rowLeft}>
          <Text style={[styles.desc, { color: theme.textPrimary }]}>{item.description}</Text>
          <Text style={[styles.amount, { color: theme.textSecondary }]}>{formatCurrency(item.amount)}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.category, { color: theme.textSecondary }]}>{item.categoryName || '—'}</Text>
          <Switch
            value={!!rememberMap[item.id]}
            onValueChange={() => toggleRemember(item.id)}
            thumbColor={theme.accent}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Uncategorized Transactions</Text>
      </View>
      <FlatList
        data={transactions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
      />
      {selectedIds.length > 0 && (
        <View style={styles.bulkActions}>
          <TouchableOpacity style={styles.bulkBtn} onPress={() => applyCategory('CATEGORY_ID_PLACEHOLDER')}>
            <Check size={20} color={theme.bg} />
            <Text style={{ color: theme.bg, marginLeft: 6 }}>Categorize</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  title: { fontSize: 20, fontWeight: '600' },
  list: { paddingBottom: 80 },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowLeft: { flex: 3 },
  rowRight: { flex: 2, alignItems: 'flex-end', justifyContent: 'center' },
  desc: { fontSize: 14 },
  amount: { fontSize: 12 },
  category: { fontSize: 12, marginBottom: 4 },
  bulkActions: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#000', padding: 12, flexDirection: 'row', justifyContent: 'center' },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4C1D95', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
});

