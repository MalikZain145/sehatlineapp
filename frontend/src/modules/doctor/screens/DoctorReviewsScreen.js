// src/screens/doctor/DoctorReviewsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Platform, StatusBar, ScrollView, SafeAreaView, Image, RefreshControl, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import { SHADOWS } from '../../../theme';
import BrandRow from '../../../components/BrandRow';
import { APP_VERSION } from '../../../constants/version';
import { showConfirm, showInfo } from '../../../components/confirm';
import doctorService from '../services/doctorService';
import { useTheme } from "../../../context/ThemeContext";
const {
  width,
  height
} = Dimensions.get('window');
const wp = p => width * p / 100;
const hp = p => height * p / 100;
const REVIEWS_KEY = '@sehatline_doctor_reviews';
const DoctorReviewsScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const filters = [{
    id: 'all',
    label: 'All'
  }, {
    id: '5',
    label: '⭐ 5'
  }, {
    id: '4',
    label: '⭐ 4'
  }, {
    id: '3',
    label: '⭐ 3'
  }, {
    id: 'below',
    label: '⭐ Below'
  }];
  useEffect(() => {
    loadReviews();
  }, []);
  const loadReviews = async () => {
    // 1) LIVE reviews for THIS doctor from the backend.
    try {
      const res = await doctorService.getReviews();
      if (Array.isArray(res?.reviews)) {
        setReviews(res.reviews.map(r => ({
          id: r.id,
          name: r.name,
          rating: r.rating,
          comment: r.comment || '',
          date: r.date ? new Date(r.date).toLocaleDateString('en-PK', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }) : '',
          reply: r.reply || null
        })));
        setLoading(false);
        return;
      }
    } catch (e) {/* offline — show real cache or empty, never mock */}
    try {
      const data = await AsyncStorage.getItem(REVIEWS_KEY);
      setReviews(data ? JSON.parse(data) : []);
    } catch (error) {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };
  const getFilteredReviews = () => {
    if (selectedFilter === 'all') return reviews;
    if (selectedFilter === 'below') return reviews.filter(r => r.rating < 4);
    return reviews.filter(r => r.rating === parseInt(selectedFilter));
  };
  const handleReply = review => {
    setSelectedReview(review);
    setReplyText(review?.reply || '');
    setShowReplyModal(true);
  };
  const submitReply = async () => {
    if (!replyText.trim()) {
      showInfo({
        title: 'Error',
        message: 'Please enter a reply.',
        icon: 'alert-circle'
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const reply = replyText.trim();
      // Send the reply to the patient (delivered as a notification) + save it.
      await doctorService.replyToReview(selectedReview.id, reply);
      const updatedReviews = reviews.map(r => r.id === selectedReview.id ? {
        ...r,
        reply
      } : r);
      setReviews(updatedReviews);
      await AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify(updatedReviews));
      setShowReplyModal(false);
      setReplyText('');
      showInfo({
        title: 'Reply Sent',
        message: 'Your reply has been sent to the patient as a notification.',
        icon: 'checkmark-circle'
      });
    } catch (error) {
      showInfo({
        title: 'Error',
        message: error?.message || 'Failed to send reply. Please try again.',
        icon: 'alert-circle'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const deleteReview = id => {
    showConfirm({
      title: 'Delete Review',
      message: 'Are you sure you want to delete this review?',
      confirmLabel: 'Delete',
      destructive: true,
      icon: 'trash-outline',
      onConfirm: async () => {
        const updatedReviews = reviews.filter(r => r.id !== id);
        setReviews(updatedReviews);
        await AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify(updatedReviews));
        showInfo({
          title: 'Review Deleted',
          message: 'Review removed successfully.',
          icon: 'checkmark-circle'
        });
      }
    });
  };
  const renderStars = rating => {
    return <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= rating ? 'star' : 'star-outline'} size={wp(3.5)} color={star <= rating ? '#F59E0B' : COLORS.textLight} />)}
      </View>;
  };
  const renderReviewCard = ({
    item
  }) => <View style={[styles.reviewCard, SHADOWS.small]}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {item.name?.charAt(0) || 'P'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.reviewDate}>{item.date}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreBtn} onPress={() => deleteReview(item.id)}>
          <Ionicons name="trash-outline" size={wp(4)} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {renderStars(item.rating)}

      <Text style={styles.comment}>{item.comment}</Text>

      {item.reply ? <View style={styles.replyContainer}>
          <View style={styles.replyHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={wp(3.5)} color={COLORS.primary} />
            <Text style={styles.replyLabel}>Your Reply</Text>
          </View>
          <Text style={styles.replyText}>{item.reply}</Text>
        </View> : <TouchableOpacity style={styles.replyBtn} onPress={() => handleReply(item)}>
          <Ionicons name="chatbubble-outline" size={wp(3.5)} color={COLORS.primary} />
          <Text style={styles.replyBtnText}>Reply</Text>
        </TouchableOpacity>}
    </View>;
  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  };
  const getRatingDistribution = () => {
    const dist = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };
    reviews.forEach(r => {
      if (dist[r.rating] !== undefined) dist[r.rating]++;
    });
    return dist;
  };
  const distribution = getRatingDistribution();
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.background} />

      <SafeAreaView style={styles.safeArea}>
        {/* ─── HEADER ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={{ flex: 1, marginLeft: 6, fontSize: 20, fontWeight: '800', color: COLORS.text }} numberOfLines={1}>Reviews</Text>

          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={wp(5)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* ─── STATS ───────────────────────────────────────────────────── */}
        <View style={[styles.statsCard, SHADOWS.small]}>
          <View style={styles.statsLeft}>
            <Text style={styles.statsRating}>{getAverageRating()}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= Math.round(parseFloat(getAverageRating())) ? 'star' : 'star-outline'} size={wp(3)} color={star <= Math.round(parseFloat(getAverageRating())) ? '#F59E0B' : COLORS.textLight} />)}
            </View>
            <Text style={styles.statsTotal}>{reviews.length} reviews</Text>
          </View>
          <View style={styles.statsRight}>
            {[5, 4, 3, 2, 1].map(star => <View key={star} style={styles.statsRow}>
                <Text style={styles.statsRowLabel}>{star}★</Text>
                <View style={styles.statsBar}>
                  <View style={[styles.statsBarFill, {
                width: `${reviews.length > 0 ? distribution[star] / reviews.length * 100 : 0}%`,
                backgroundColor: star >= 4 ? COLORS.success : star >= 3 ? COLORS.warning : COLORS.danger
              }]} />
                </View>
                <Text style={styles.statsRowCount}>{distribution[star]}</Text>
              </View>)}
          </View>
        </View>

        {/* ─── FILTERS ─────────────────────────────────────────────────── */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filters.map(filter => <TouchableOpacity key={filter.id} style={[styles.filterChip, selectedFilter === filter.id && styles.filterChipActive]} onPress={() => setSelectedFilter(filter.id)}>
                <Text style={[styles.filterText, selectedFilter === filter.id && styles.filterTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>)}
          </ScrollView>
        </View>

        {/* ─── REVIEWS LIST ───────────────────────────────────────────── */}
        <FlatList data={loading ? [] : getFilteredReviews()} keyExtractor={item => item.id} renderItem={renderReviewCard} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />} ListEmptyComponent={loading ? <SkeletonList count={5} /> : <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={wp(15)} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No Reviews</Text>
              <Text style={styles.emptySub}>No reviews match your filter</Text>
            </View>} />

        {/* ─── REPLY MODAL ────────────────────────────────────────────── */}
        <Modal visible={showReplyModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, SHADOWS.large]}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reply to Review</Text>
                <TouchableOpacity onPress={() => setShowReplyModal(false)}>
                  <Ionicons name="close" size={wp(5)} color={COLORS.white} />
                </TouchableOpacity>
              </LinearGradient>

              <View style={styles.modalBody}>
                <View style={styles.reviewPreview}>
                  <Text style={styles.reviewPreviewName}>{selectedReview?.name}</Text>
                  {selectedReview && renderStars(selectedReview.rating)}
                  <Text style={styles.reviewPreviewComment}>{selectedReview?.comment}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Your Reply</Text>
                  <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Write your reply..." placeholderTextColor={COLORS.textLight} multiline numberOfLines={4} value={replyText} onChangeText={setReplyText} />
                </View>

                <TouchableOpacity style={[styles.submitBtn, (!replyText.trim() || isSubmitting) && styles.submitBtnDisabled]} onPress={submitReply} disabled={!replyText.trim() || isSubmitting}>
                  <LinearGradient colors={replyText.trim() ? [COLORS.primary, COLORS.secondary] : [COLORS.border, COLORS.border]} style={styles.submitGradient}>
                    {isSubmitting ? <ActivityIndicator color={COLORS.white} size="small" /> : <>
                        <Ionicons name="send-outline" size={wp(4)} color={COLORS.white} />
                        <Text style={styles.submitText}>Post Reply</Text>
                      </>}
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
    flex: 1
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
  refreshBtn: {
    width: wp(9),
    height: wp(9),
    justifyContent: 'center',
    alignItems: 'center'
  },
  // ── Stats Card ──────────────────────────────────────────────────
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: wp(3.5),
    padding: wp(4),
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  statsLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border
  },
  statsRating: {
    fontSize: wp(8),
    fontWeight: '700',
    color: COLORS.text
  },
  starsContainer: {
    flexDirection: 'row',
    gap: wp(0.5),
    marginTop: hp(0.2)
  },
  statsTotal: {
    fontSize: wp(2.8),
    color: COLORS.textLight,
    marginTop: hp(0.2)
  },
  statsRight: {
    flex: 1.5,
    paddingLeft: wp(3),
    justifyContent: 'center'
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginVertical: hp(0.1)
  },
  statsRowLabel: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary,
    width: wp(6)
  },
  statsBar: {
    flex: 1,
    height: hp(0.6),
    backgroundColor: COLORS.border,
    borderRadius: hp(0.3),
    overflow: 'hidden'
  },
  statsBarFill: {
    height: '100%',
    borderRadius: hp(0.3)
  },
  statsRowCount: {
    fontSize: wp(2.6),
    color: COLORS.textSecondary,
    width: wp(4),
    textAlign: 'right'
  },
  // ── Filters ──────────────────────────────────────────────────────
  filterContainer: {
    backgroundColor: COLORS.card,
    marginTop: hp(1.2),
    paddingVertical: hp(0.8),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.small
  },
  filterScroll: {
    paddingHorizontal: wp(4),
    gap: wp(2)
  },
  filterChip: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.5),
    borderRadius: wp(5),
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: wp(3),
    fontWeight: '500'
  },
  filterTextActive: {
    color: COLORS.white
  },
  // ── List ─────────────────────────────────────────────────────────
  listContent: {
    padding: wp(4),
    paddingBottom: hp(2)
  },
  // ── Review Card ──────────────────────────────────────────────────
  reviewCard: {
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5)
  },
  userAvatar: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center'
  },
  userAvatarText: {
    fontSize: wp(4),
    fontWeight: '700',
    color: COLORS.primary
  },
  userName: {
    fontSize: wp(3.5),
    fontWeight: '600',
    color: COLORS.text
  },
  reviewDate: {
    fontSize: wp(2.6),
    color: COLORS.textLight
  },
  moreBtn: {
    padding: wp(1)
  },
  comment: {
    fontSize: wp(3.2),
    color: COLORS.textSecondary,
    lineHeight: hp(2.5),
    marginTop: hp(0.3)
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginTop: hp(1),
    paddingTop: hp(0.8),
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  replyBtnText: {
    fontSize: wp(2.8),
    color: COLORS.primary,
    fontWeight: '600'
  },
  replyContainer: {
    marginTop: hp(1),
    paddingTop: hp(0.8),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.primary + '05',
    padding: wp(2.5),
    borderRadius: wp(2)
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginBottom: hp(0.2)
  },
  replyLabel: {
    fontSize: wp(2.6),
    color: COLORS.primary,
    fontWeight: '600'
  },
  replyText: {
    fontSize: wp(3),
    color: COLORS.text,
    lineHeight: hp(2.2)
  },
  // ── Empty State ──────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    marginTop: hp(8),
    paddingHorizontal: wp(4)
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
    marginTop: hp(0.5),
    textAlign: 'center'
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
  reviewPreview: {
    backgroundColor: COLORS.backgroundSecondary,
    padding: wp(3),
    borderRadius: wp(2),
    marginBottom: hp(1)
  },
  reviewPreviewName: {
    fontSize: wp(3.2),
    fontWeight: '600',
    color: COLORS.text
  },
  reviewPreviewComment: {
    fontSize: wp(3),
    color: COLORS.textSecondary,
    marginTop: hp(0.2)
  },
  inputGroup: {
    marginBottom: hp(1)
  },
  inputLabel: {
    fontSize: wp(2.8),
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: hp(0.2)
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
  submitBtn: {
    borderRadius: wp(2.5),
    overflow: 'hidden',
    marginTop: hp(0.5)
  },
  submitBtnDisabled: {
    opacity: 0.6
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.2),
    gap: wp(2)
  },
  submitText: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: '700'
  },
  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingTop: hp(1.5),
    paddingBottom: hp(1),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginHorizontal: wp(4)
  },
  footerText: {
    fontSize: wp(2.6),
    color: COLORS.textLight
  }
});
export default DoctorReviewsScreen;