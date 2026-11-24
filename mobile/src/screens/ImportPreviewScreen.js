// ImportPreviewScreen – Review imported CSV transactions, filter, categorize, and bulk remember counterparty mappings
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../api';
import { formatCurrency } from '../theme';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  X,
  Filter,
  Layers,
  Sparkles,
  HelpCircle,
  BookmarkCheck,
  ChevronRight,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ImportPreviewScreen({
  theme,
  onNavigate,
  onFinish,
}) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [rememberMap, setRememberMap] = useState({});
  const [filters, setFilters] = useState('ALL'); // ALL, CATEGORIZED, NEEDS_REVIEW, INCOME, EXPENSE
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal category picker state
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [activeTxForEdit, setActiveTxForEdit] = useState(null); // single tx edit mode
  const [rememberOption, setRememberOption] = useState(true);

  const fetchTransactionsAndCategories = async () => {
    setLoading(true);
    try {
      const [txs, cats] = await Promise.all([
        api.getTransactions('?limit=100').catch(() => []),
        api.getCategories().catch(() => []),
      ]);
      setTransactions(Array.isArray(txs) ? txs : txs?.transactions || []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e) {
      console.warn('Failed to load transactions/categories for review', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionsAndCategories();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactionsAndCategories();
    setRefreshing(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedIds.length === filteredTx.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTx.map((t) => t.id));
    }
  };

  const toggleRemember = (id) => {
    setRememberMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCategoryPickerForSingle = (tx) => {
    setActiveTxForEdit(tx);
    setRememberOption(true);
    setPickerModalVisible(true);
  };

  const openCategoryPickerForBulk = () => {
    if (selectedIds.length === 0) return;
    setActiveTxForEdit(null); // bulk mode
    setRememberOption(true);
    setPickerModalVisible(true);
  };

  const handleSelectCategory = async (cat) => {
    setPickerModalVisible(false);
    setLoading(true);

    try {
      if (activeTxForEdit) {
        // Single transaction category update
        await api.updateTransactionCategory(activeTxForEdit.id, {
          categoryId: cat.id,
          rememberMapping: rememberOption,
        });

        if (rememberOption) {
          const merchantName =
            activeTxForEdit.extractedMerchantName ||
            activeTxForEdit.cleanMerchantName ||
            activeTxForEdit.merchantName;
          await api.createUserMapping({
            merchantName,
            counterpartyIdentifier: activeTxForEdit.counterpartyIdentifier,
            categoryId: cat.id,
          }).catch(() => null);
        }
      } else {
        // Bulk categorization
        const representativeTx = transactions.find((t) => selectedIds.includes(t.id));
        const merchantName =
          representativeTx?.extractedMerchantName ||
          representativeTx?.cleanMerchantName ||
          representativeTx?.merchantName;

        await api.bulkCategorize({
          transactionIds: selectedIds,
          categoryId: cat.id,
          rememberMapping: rememberOption,
          merchantName: rememberOption ? merchantName : null,
          counterpartyIdentifier: rememberOption ? representativeTx?.counterpartyIdentifier : null,
        });
        setSelectedIds([]);
      }

      await fetchTransactionsAndCategories();
      Alert.alert('Categorized', `Assigned "${cat.name}" category successfully.`);
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Could not update category.');
    } finally {
      setLoading(false);
      setActiveTxForEdit(null);
    }
  };

  // Metrics summary
  const summary = useMemo(() => {
    const total = transactions.length;
    const needsReview = transactions.filter(
      (t) =>
        t.categorizationStatus === 'NEEDS_REVIEW' ||
        t.categorizationSource === 'UNCATEGORIZED' ||
        !t.isUserVerified ||
        t.category?.name === 'Miscellaneous Expense' ||
        t.category?.name === 'Miscellaneous Income'
    ).length;
    const categorized = total - needsReview;
    const income = transactions.filter((t) => t.type === 'CREDIT').length;
    const expense = transactions.filter((t) => t.type === 'DEBIT').length;
    return { total, categorized, needsReview, income, expense };
  }, [transactions]);

  // Filtering
  const filteredTx = useMemo(() => {
    if (filters === 'ALL') return transactions;
    if (filters === 'CATEGORIZED') {
      return transactions.filter(
        (t) =>
          (t.categorizationStatus === 'AUTO_CATEGORIZED' ||
            t.categorizationStatus === 'MANUALLY_CATEGORIZED' ||
            t.isUserVerified) &&
          t.category?.name !== 'Miscellaneous Expense' &&
          t.category?.name !== 'Miscellaneous Income'
      );
    }
    if (filters === 'NEEDS_REVIEW') {
      return transactions.filter(
        (t) =>
          t.categorizationStatus === 'NEEDS_REVIEW' ||
          t.categorizationSource === 'UNCATEGORIZED' ||
          !t.isUserVerified ||
          t.category?.name === 'Miscellaneous Expense' ||
          t.category?.name === 'Miscellaneous Income'
      );
    }
    if (filters === 'INCOME') return transactions.filter((t) => t.type === 'CREDIT');
    if (filters === 'EXPENSE') return transactions.filter((t) => t.type === 'DEBIT');
    return transactions;
  }, [transactions, filters]);

  const renderBadge = (item) => {
    if (item.categorizationSource === 'USER_MAPPING') {
      return (
        <View style={[styles.badge, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
          <BookmarkCheck size={11} color="#6366F1" />
          <Text style={[styles.badgeText, { color: '#6366F1' }]}>User Rule</Text>
        </View>
      );
    }
    if (item.categorizationSource === 'GLOBAL_MERCHANT') {
      return (
        <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
          <Sparkles size={11} color="#10B981" />
          <Text style={[styles.badgeText, { color: '#10B981' }]}>Verified Merchant</Text>
        </View>
      );
    }
    if (item.categorizationStatus === 'NEEDS_REVIEW' || !item.isUserVerified) {
      return (
        <View style={[styles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
          <HelpCircle size={11} color="#F59E0B" />
          <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Needs Review</Text>
        </View>
      );
    }
    return null;
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    const isCredit = item.type === 'CREDIT';
    const displayName =
      item.extractedMerchantName ||
      item.cleanMerchantName ||
      item.merchantName ||
      item.description ||
      'Transaction';

    return (
      <View
        style={[
          styles.row,
          { backgroundColor: theme.surface, borderColor: theme.border },
          isSelected && { backgroundColor: theme.surfaceAlt, borderColor: theme.primary },
        ]}
      >
        {/* Selection Checkbox */}
        <TouchableOpacity
          onPress={() => toggleSelect(item.id)}
          style={[
            styles.checkCircle,
            { borderColor: theme.border },
            isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
        >
          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
        </TouchableOpacity>

        {/* Transaction Details */}
        <View style={styles.rowLeft}>
          <View style={styles.titleLine}>
            <Text style={[styles.desc, { color: theme.textPrimary }]} numberOfLines={1}>
              {displayName}
            </Text>
            {renderBadge(item)}
          </View>

          <Text style={[styles.subText, { color: theme.textMuted }]} numberOfLines={1}>
            {item.description}
          </Text>

          <View style={styles.amountLine}>
            <Text
              style={[
                styles.amount,
                { color: isCredit ? theme.accentEmerald || '#10B981' : theme.textPrimary },
              ]}
            >
              {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
            </Text>
            <Text style={[styles.dateText, { color: theme.textMuted }]}>
              {item.transactionAt ? new Date(item.transactionAt).toLocaleDateString('en-IN') : ''}
            </Text>
          </View>
        </View>

        {/* Category Pill Button */}
        <TouchableOpacity
          onPress={() => openCategoryPickerForSingle(item)}
          style={[styles.categoryPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
        >
          <Text style={[styles.categoryPillText, { color: theme.primary }]} numberOfLines={1}>
            {item.category?.name || 'Unassigned'}
          </Text>
          <ChevronRight size={14} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Transaction Review</Text>
          {onFinish && (
            <TouchableOpacity onPress={onFinish} style={[styles.doneBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Metrics Banner */}
        <View style={[styles.metricsBanner, { backgroundColor: theme.surfaceAlt }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricCount, { color: theme.textPrimary }]}>{summary.total}</Text>
            <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Detected</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricCount, { color: '#10B981' }]}>{summary.categorized}</Text>
            <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Auto-Cat</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricCount, { color: '#F59E0B' }]}>{summary.needsReview}</Text>
            <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Review</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterBar}>
          {[
            { id: 'ALL', label: `All (${summary.total})` },
            { id: 'NEEDS_REVIEW', label: `Review (${summary.needsReview})` },
            { id: 'CATEGORIZED', label: `Categorized (${summary.categorized})` },
            { id: 'EXPENSE', label: 'Expenses' },
            { id: 'INCOME', label: 'Income' },
          ].map((f) => {
            const active = filters === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilters(f.id)}
                style={[
                  styles.filterBtn,
                  { backgroundColor: theme.surfaceAlt },
                  active && { backgroundColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    { color: theme.textMuted },
                    active && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Select All & Selection Status Bar */}
      {filteredTx.length > 0 && (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={selectAllFiltered}>
            <Text style={[styles.selectAllText, { color: theme.primary }]}>
              {selectedIds.length === filteredTx.length ? 'Deselect All' : `Select All (${filteredTx.length})`}
            </Text>
          </TouchableOpacity>
          {selectedIds.length > 0 && (
            <Text style={[styles.selectedCountText, { color: theme.textMuted }]}>
              {selectedIds.length} selected
            </Text>
          )}
        </View>
      )}

      {/* Transaction List */}
      <FlatList
        data={filteredTx}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {loading ? 'Loading transactions...' : 'No transactions match this filter.'}
            </Text>
          </View>
        }
      />

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <View style={[styles.bulkActionBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <View style={styles.bulkInfo}>
            <Text style={[styles.bulkCount, { color: theme.textPrimary }]}>
              {selectedIds.length} transaction{selectedIds.length > 1 ? 's' : ''} selected
            </Text>
            <Text style={[styles.bulkSub, { color: theme.textMuted }]}>
              Choose category to apply in bulk
            </Text>
          </View>
          <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: theme.primary }]} onPress={openCategoryPickerForBulk}>
            <Check size={16} color="#FFFFFF" />
            <Text style={styles.bulkBtnText}>Assign Category</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category Picker Modal */}
      <Modal visible={pickerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {activeTxForEdit ? 'Choose Category' : `Bulk Categorize (${selectedIds.length})`}
                </Text>
                {activeTxForEdit && (
                  <Text style={[styles.modalSub, { color: theme.textMuted }]} numberOfLines={1}>
                    {activeTxForEdit.extractedMerchantName || activeTxForEdit.cleanMerchantName || activeTxForEdit.merchantName}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setPickerModalVisible(false)}>
                <X size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Remember Mapping Option */}
            <View style={[styles.rememberBox, { backgroundColor: theme.surfaceAlt }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rememberTitle, { color: theme.textPrimary }]}>
                  Remember for future transactions
                </Text>
                <Text style={[styles.rememberSub, { color: theme.textMuted }]}>
                  Automatically apply this category to this counterparty next time.
                </Text>
              </View>
              <Switch
                value={rememberOption}
                onValueChange={setRememberOption}
                thumbColor={rememberOption ? theme.primary : '#ccc'}
              />
            </View>

            {/* Categories List */}
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingVertical: 10 }}
              renderItem={({ item: cat }) => (
                <TouchableOpacity
                  onPress={() => handleSelectCategory(cat)}
                  style={[styles.categoryOption, { borderBottomColor: theme.border }]}
                >
                  <View style={[styles.catColorDot, { backgroundColor: cat.colorHex || theme.primary }]} />
                  <Text style={[styles.categoryOptionName, { color: theme.textPrimary }]}>
                    {cat.name}
                  </Text>
                  <Text style={[styles.categoryTypeTag, { color: theme.textMuted }]}>
                    {cat.categoryType}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  doneBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  metricsBanner: { flexDirection: 'row', borderRadius: 14, paddingVertical: 10, marginBottom: 10 },
  metricItem: { flex: 1, alignItems: 'center' },
  metricCount: { fontSize: 17, fontWeight: '800' },
  metricLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  filterBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  filterBtnText: { fontSize: 12, fontWeight: '600' },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectAllText: { fontSize: 13, fontWeight: '700' },
  selectedCountText: { fontSize: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rowLeft: { flex: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  desc: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  subText: { fontSize: 11, marginBottom: 4 },
  amountLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontSize: 13, fontWeight: '800' },
  dateText: { fontSize: 11 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 8,
  },
  categoryPillText: { fontSize: 12, fontWeight: '700', maxWidth: 85 },
  bulkActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  bulkInfo: { flex: 1 },
  bulkCount: { fontSize: 14, fontWeight: '800' },
  bulkSub: { fontSize: 11 },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bulkBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 12, marginTop: 2 },
  rememberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  rememberTitle: { fontSize: 13, fontWeight: '700' },
  rememberSub: { fontSize: 11, marginTop: 2 },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catColorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  categoryOptionName: { fontSize: 15, fontWeight: '600', flex: 1 },
  categoryTypeTag: { fontSize: 11, fontWeight: '600' },
});
