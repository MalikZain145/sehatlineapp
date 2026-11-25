// src/screens/doctor/PrescriptionTemplatesScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, Platform, StatusBar, SafeAreaView, Image, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHADOWS } from '../../../theme';
import BrandRow from '../../../components/BrandRow';
import { showConfirm, showInfo } from '../../../components/confirm';
import { useTheme } from "../../../context/ThemeContext";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const TEMPLATES_KEY = '@sehatline_prescription_templates';
const PrescriptionTemplatesScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('');
  const [newTemplateMedicines, setNewTemplateMedicines] = useState('');
  useEffect(() => {
    loadTemplates();
  }, []);
  const loadTemplates = async () => {
    try {
      const data = await AsyncStorage.getItem(TEMPLATES_KEY);
      if (data) {
        setTemplates(JSON.parse(data));
      } else {
        // Default templates
        const defaultTemplates = [{
          id: '1',
          name: 'Hypertension',
          category: 'Cardiology',
          medicines: ['Amlodipine 5mg - Once daily', 'Lisinopril 10mg - Once daily']
        }, {
          id: '2',
          name: 'Angina / Chest Pain',
          category: 'Cardiology',
          medicines: ['Aspirin 75mg - Once daily', 'Nitroglycerin 0.4mg - As needed', 'Atorvastatin 20mg - Nightly']
        }, {
          id: '3',
          name: 'Heart Failure',
          category: 'Cardiology',
          medicines: ['Furosemide 40mg - Once daily', 'Ramipril 5mg - Once daily', 'Metoprolol 25mg - Twice daily']
        }, {
          id: '4',
          name: 'Arrhythmia',
          category: 'Cardiology',
          medicines: ['Amiodarone 200mg - Once daily', 'Bisoprolol 5mg - Once daily']
        }, {
          id: '5',
          name: 'High Cholesterol',
          category: 'Cardiology',
          medicines: ['Atorvastatin 40mg - Nightly', 'Rosuvastatin 10mg - Nightly']
        }];
        setTemplates(defaultTemplates);
        await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(defaultTemplates));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };
  const saveTemplates = async newTemplates => {
    try {
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(newTemplates));
      setTemplates(newTemplates);
    } catch (error) {
      console.error('Error saving templates:', error);
      showInfo({
        title: 'Error',
        message: 'Failed to save template.',
        icon: 'alert-circle'
      });
    }
  };
  const addTemplate = () => {
    if (!newTemplateName.trim()) {
      showInfo({
        title: 'Error',
        message: 'Please enter template name.',
        icon: 'alert-circle'
      });
      return;
    }
    if (!newTemplateMedicines.trim()) {
      showInfo({
        title: 'Error',
        message: 'Please enter medicines.',
        icon: 'alert-circle'
      });
      return;
    }
    const newTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      category: newTemplateCategory.trim() || 'General',
      medicines: newTemplateMedicines.split('\n').filter(m => m.trim())
    };
    const updatedTemplates = [newTemplate, ...templates];
    saveTemplates(updatedTemplates);
    setShowAddModal(false);
    setNewTemplateName('');
    setNewTemplateCategory('');
    setNewTemplateMedicines('');
    showInfo({
      title: 'Template Added',
      message: `${newTemplate.name} template created successfully.`,
      icon: 'checkmark-circle'
    });
  };
  const deleteTemplate = id => {
    showConfirm({
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template?',
      confirmLabel: 'Delete',
      destructive: true,
      icon: 'trash-outline',
      onConfirm: () => {
        const updatedTemplates = templates.filter(t => t.id !== id);
        saveTemplates(updatedTemplates);
        showInfo({
          title: 'Template Deleted',
          message: 'Template removed successfully.',
          icon: 'checkmark-circle'
        });
      }
    });
  };
  const useTemplate = template => {
    showConfirm({
      title: 'Apply Template',
      message: `Apply "${template.name}" template to prescription?`,
      confirmLabel: 'Apply',
      icon: 'albums-outline',
      onConfirm: () => {
        navigation.navigate('Prescription', {
          template: template,
          medicines: template.medicines
        });
      }
    });
  };
  const getCategoryColor = category => {
    const colors = {
      'Cardiology': COLORS.primary,
      'Respiratory': '#3B82F6',
      'Endocrinology': '#EC4899',
      'Neurology': '#8B5CF6',
      'General': COLORS.textSecondary
    };
    return colors[category] || COLORS.textSecondary;
  };
  const getCategoryIcon = category => {
    const icons = {
      'Cardiology': 'heart-outline',
      'Respiratory': 'lungs-outline',
      'Endocrinology': 'fitness-outline',
      'Neurology': 'pulse-outline',
      'General': 'medical-outline'
    };
    return icons[category] || 'medical-outline';
  };
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <SafeAreaView style={styles.safeArea}>
        {/* ─── HEADER ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={{ flex: 1, marginLeft: 6, fontSize: 20, fontWeight: '800', color: COLORS.text }} numberOfLines={1}>Templates</Text>

          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.addBtnGradient}>
              <Ionicons name="add" size={wp(4.5)} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {templates.length > 0 ? templates.map(template => <TouchableOpacity key={template.id} style={[styles.templateCard, SHADOWS.small]} onPress={() => useTemplate(template)} activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                  <View style={[styles.categoryBadge, {
              backgroundColor: getCategoryColor(template.category) + '15'
            }]}>
                    <Ionicons name={getCategoryIcon(template.category)} size={wp(3)} color={getCategoryColor(template.category)} />
                    <Text style={[styles.categoryText, {
                color: getCategoryColor(template.category)
              }]}>
                      {template.category || 'General'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={e => {
              e.stopPropagation();
              deleteTemplate(template.id);
            }}>
                    <Ionicons name="trash-outline" size={wp(3.5)} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.templateName}>{template.name}</Text>

                <View style={styles.medicinesList}>
                  {template.medicines.slice(0, 3).map((med, index) => <View key={index} style={styles.medicineItem}>
                      <View style={styles.medicineDot} />
                      <Text style={styles.medicineText} numberOfLines={1}>{med}</Text>
                    </View>)}
                  {template.medicines.length > 3 && <Text style={styles.moreMedicines}>+{template.medicines.length - 3} more</Text>}
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.medicineCount}>
                    {template.medicines.length} medicine{template.medicines.length > 1 ? 's' : ''}
                  </Text>
                  <TouchableOpacity style={styles.useBtn} onPress={() => useTemplate(template)}>
                    <Text style={styles.useBtnText}>Use Template</Text>
                    <Ionicons name="arrow-forward" size={wp(3)} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>) : <View style={styles.emptyState}>
              <Ionicons name="albums-outline" size={wp(15)} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No Templates</Text>
              <Text style={styles.emptySub}>Create your first prescription template</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
                <Text style={styles.emptyBtnText}>Create Template</Text>
              </TouchableOpacity>
            </View>}
        </ScrollView>

        {/* ─── ADD TEMPLATE MODAL ──────────────────────────────────────── */}
        <Modal visible={showAddModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, SHADOWS.large]}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📋 New Template</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={wp(5)} color={COLORS.white} />
                </TouchableOpacity>
              </LinearGradient>

              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Template Name *</Text>
                  <TextInput style={styles.input} placeholder="e.g., Hypertension Protocol" placeholderTextColor={COLORS.textLight} value={newTemplateName} onChangeText={setNewTemplateName} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <TextInput style={styles.input} placeholder="e.g., Cardiology" placeholderTextColor={COLORS.textLight} value={newTemplateCategory} onChangeText={setNewTemplateCategory} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Medicines *</Text>
                  <Text style={styles.inputHint}>One medicine per line</Text>
                  <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Aspirin 75mg - Once daily&#10;Atorvastatin 20mg - Nightly" placeholderTextColor={COLORS.textLight} multiline numberOfLines={4} value={newTemplateMedicines} onChangeText={setNewTemplateMedicines} />
                </View>

                <TouchableOpacity style={[styles.createBtn, (!newTemplateName.trim() || !newTemplateMedicines.trim()) && styles.createBtnDisabled]} onPress={addTemplate} disabled={!newTemplateName.trim() || !newTemplateMedicines.trim()}>
                  <LinearGradient colors={newTemplateName.trim() && newTemplateMedicines.trim() ? [COLORS.primary, COLORS.secondary] : [COLORS.border, COLORS.border]} style={styles.createGradient}>
                    <Ionicons name="save-outline" size={wp(4)} color={COLORS.white} />
                    <Text style={styles.createBtnText}>Create Template</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  safeArea: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
  },
  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(1.5) : (StatusBar.currentHeight || 28) + 14,
    paddingBottom: hp(1.5),
    backgroundColor: COLORS.card,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary + '20'
  },
  menuBtn: {
    width: wp(9),
    height: wp(9),
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2)
  },
  headerLogo: {
    width: wp(10),
    height: wp(10),
    resizeMode: 'contain'
  },
  headerTitle: {
    fontSize: wp(4.8),
    fontWeight: '700',
    color: COLORS.text
  },
  addBtn: {
    borderRadius: wp(2.5),
    overflow: 'hidden'
  },
  addBtnGradient: {
    width: wp(9),
    height: wp(9),
    alignItems: 'center',
    justifyContent: 'center'
  },
  // ── Scroll ────────────────────────────────────────────────────────
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: wp(4),
    paddingBottom: hp(4)
  },
  // ── Template Card ──────────────────────────────────────────────────
  templateCard: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3.5),
    padding: wp(3.5),
    marginBottom: hp(1.2),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.3)
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.2),
    borderRadius: wp(2),
    gap: wp(1)
  },
  categoryText: {
    fontSize: wp(2.4),
    fontWeight: '600'
  },
  deleteBtn: {
    padding: wp(1)
  },
  templateName: {
    fontSize: wp(4),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(0.3)
  },
  medicinesList: {
    marginVertical: hp(0.3)
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingVertical: hp(0.1)
  },
  medicineDot: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.75),
    backgroundColor: COLORS.primary
  },
  medicineText: {
    fontSize: wp(2.8),
    color: COLORS.textSecondary,
    flex: 1
  },
  moreMedicines: {
    fontSize: wp(2.6),
    color: COLORS.textLight,
    marginTop: hp(0.1)
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(0.5),
    paddingTop: hp(0.5),
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  medicineCount: {
    fontSize: wp(2.6),
    color: COLORS.textLight
  },
  useBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.3),
    borderRadius: wp(2.5),
    gap: wp(1)
  },
  useBtnText: {
    fontSize: wp(2.6),
    fontWeight: '600',
    color: COLORS.white
  },
  // ── Empty State ──────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: hp(8)
  },
  emptyTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: COLORS.text,
    marginTop: hp(1)
  },
  emptySub: {
    fontSize: wp(3.2),
    color: COLORS.textLight,
    marginTop: hp(0.2)
  },
  emptyBtn: {
    marginTop: hp(2),
    backgroundColor: COLORS.primary,
    paddingHorizontal: wp(8),
    paddingVertical: hp(1),
    borderRadius: wp(3)
  },
  emptyBtnText: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  // ── Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: width * 0.92,
    maxHeight: height * 0.85,
    backgroundColor: COLORS.card,
    borderRadius: wp(4),
    overflow: 'hidden'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4)
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: wp(4.5),
    fontWeight: 'bold'
  },
  modalBody: {
    padding: wp(4)
  },
  inputGroup: {
    marginBottom: hp(1.2)
  },
  inputLabel: {
    fontSize: wp(2.8),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: hp(0.2)
  },
  inputHint: {
    fontSize: wp(2.4),
    color: COLORS.textLight,
    marginBottom: hp(0.1)
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2.5),
    padding: wp(2.5),
    fontSize: wp(3.2),
    color: COLORS.text,
    backgroundColor: COLORS.backgroundSecondary
  },
  inputMultiline: {
    minHeight: hp(10),
    textAlignVertical: 'top'
  },
  createBtn: {
    borderRadius: wp(2.5),
    overflow: 'hidden',
    marginTop: hp(0.5)
  },
  createBtnDisabled: {
    opacity: 0.6
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    gap: wp(2)
  },
  createBtnText: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: '700'
  }
});
export default PrescriptionTemplatesScreen;