import { useTheme } from "../../context/ThemeContext";
// ModernDatePicker — an in-app calendar for picking a date of birth.
//
// Navigation drills down the way people actually think about a birth date:
//     YEAR  →  MONTH  →  DAY
//
// Starting on the year grid matters for a DOB: paging month-by-month from
// today back to 1995 would take hundreds of taps. Tapping the header at any
// level walks back up.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
const {
  width
} = Dimensions.get('window');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const LEVEL = {
  YEAR: 'year',
  MONTH: 'month',
  DAY: 'day'
};
export default function ModernDatePicker({
  visible,
  onClose,
  onSelect,
  initialDate
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const today = new Date();
  const start = initialDate ? new Date(initialDate) : null;
  const [level, setLevel] = useState(start ? LEVEL.DAY : LEVEL.YEAR);
  const [viewYear, setViewYear] = useState(start ? start.getFullYear() : today.getFullYear() - 20);
  const [viewMonth, setViewMonth] = useState(start ? start.getMonth() : 0);
  const [selected, setSelected] = useState(start);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // 120 years back, newest first.
  const years = [];
  for (let y = today.getFullYear(); y >= today.getFullYear() - 120; y--) years.push(y);
  const pickYear = y => {
    setViewYear(y);
    setLevel(LEVEL.MONTH);
  };
  const pickMonth = m => {
    setViewMonth(m);
    setLevel(LEVEL.DAY);
  };
  const pickDay = d => setSelected(new Date(viewYear, viewMonth, d));
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else setViewMonth(m => m + 1);
  };
  const confirm = () => {
    if (!selected) return;
    const y = selected.getFullYear();
    const m = String(selected.getMonth() + 1).padStart(2, '0');
    const d = String(selected.getDate()).padStart(2, '0');
    onSelect(`${y}-${m}-${d}`, selected);
    onClose();
  };
  const isSelected = d => selected && selected.getDate() === d && selected.getMonth() === viewMonth && selected.getFullYear() === viewYear;
  const isFuture = d => new Date(viewYear, viewMonth, d) > today;

  // Header breadcrumb: tapping a crumb walks back up a level.
  const renderHeaderNav = () => {
    if (level === LEVEL.YEAR) {
      return <Text style={styles.navTitle}>Select Year</Text>;
    }
    if (level === LEVEL.MONTH) {
      return <TouchableOpacity style={styles.crumbBtn} onPress={() => setLevel(LEVEL.YEAR)}>
          <Ionicons name="chevron-back" size={16} color={COLORS.secondary} />
          <Text style={styles.navTitle}>{viewYear}</Text>
        </TouchableOpacity>;
    }
    return <View style={styles.dayNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={COLORS.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.crumbBtn} onPress={() => setLevel(LEVEL.MONTH)}>
          <Text style={styles.navTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
          <Ionicons name="chevron-down" size={15} color="#94A3B8" />
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>;
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.header}>
            <Text style={styles.headerLabel}>DATE OF BIRTH</Text>
            <Text style={styles.headerDate}>
              {selected ? selected.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : 'Select a date'}
            </Text>
          </LinearGradient>

          {/* Nav row */}
          <View style={styles.navRow}>{renderHeaderNav()}</View>

          {/* Body */}
          {level === LEVEL.YEAR && <ScrollView style={styles.scroll} contentContainerStyle={styles.grid3}>
              {years.map(y => <TouchableOpacity key={y} style={[styles.gridBtn, y === viewYear && styles.gridBtnActive]} onPress={() => pickYear(y)}>
                  <Text style={[styles.gridText, y === viewYear && styles.gridTextActive]}>{y}</Text>
                </TouchableOpacity>)}
            </ScrollView>}

          {level === LEVEL.MONTH && <View style={styles.monthGrid}>
              {MONTHS_SHORT.map((m, i) => {
            // A month later this year than today can't hold a birth date.
            const disabled = viewYear === today.getFullYear() && i > today.getMonth();
            return <TouchableOpacity key={m} style={[styles.gridBtn, i === viewMonth && styles.gridBtnActive, disabled && styles.gridBtnDisabled]} onPress={() => !disabled && pickMonth(i)} disabled={disabled}>
                    <Text style={[styles.gridText, i === viewMonth && styles.gridTextActive, disabled && styles.gridTextDisabled]}>{m}</Text>
                  </TouchableOpacity>;
          })}
            </View>}

          {level === LEVEL.DAY && <View style={styles.body}>
              <View style={styles.weekRow}>
                {DAYS.map((d, i) => <Text key={i} style={styles.weekDay}>{d}</Text>)}
              </View>
              <View style={styles.grid}>
                {cells.map((d, i) => <View key={i} style={styles.cell}>
                    {d ? <TouchableOpacity style={[styles.dayBtn, isSelected(d) && styles.dayBtnActive]} onPress={() => !isFuture(d) && pickDay(d)} disabled={isFuture(d)}>
                        <Text style={[styles.dayText, isSelected(d) && styles.dayTextActive, isFuture(d) && styles.dayTextDisabled]}>{d}</Text>
                      </TouchableOpacity> : <View style={styles.dayBtn} />}
                  </View>)}
              </View>
            </View>}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, !selected && {
            opacity: 0.5
          }]} onPress={confirm} disabled={!selected}>
              <LinearGradient colors={[COLORS.secondary, COLORS.primary]} start={{
              x: 0,
              y: 0
            }} end={{
              x: 1,
              y: 0
            }} style={styles.confirmInner}>
                <Text style={styles.confirmText}>Confirm</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>;
}
const CELL = (width - 56 - 32) / 7;
const makeStyles = COLORS => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3,4,94,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    overflow: 'hidden'
  },
  header: {
    padding: 18
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1
  },
  headerDate: {
    color: '#FFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 3
  },
  navRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    minHeight: 48,
    justifyContent: 'center'
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text
  },
  crumbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center'
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.mintLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scroll: {
    maxHeight: 260
  },
  grid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingBottom: 8,
    justifyContent: 'space-between'
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'space-between'
  },
  gridBtn: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: COLORS.surface
  },
  gridBtnActive: {
    backgroundColor: COLORS.primary
  },
  gridBtnDisabled: {
    backgroundColor: COLORS.background
  },
  gridText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.text
  },
  gridTextActive: {
    color: '#FFF'
  },
  gridTextDisabled: {
    color: '#CBD5E1'
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 8
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  weekDay: {
    width: CELL,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  cell: {
    width: CELL,
    height: CELL,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dayBtn: {
    width: CELL - 6,
    height: CELL - 6,
    borderRadius: (CELL - 6) / 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dayBtnActive: {
    backgroundColor: COLORS.primary
  },
  dayText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600'
  },
  dayTextActive: {
    color: '#FFF',
    fontWeight: '800'
  },
  dayTextDisabled: {
    color: '#CBD5E1'
  },
  actions: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center'
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 14
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 13,
    overflow: 'hidden'
  },
  confirmInner: {
    paddingVertical: 13,
    alignItems: 'center'
  },
  confirmText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14
  }
});