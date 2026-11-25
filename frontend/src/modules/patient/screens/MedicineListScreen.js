import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Dimensions, Platform, StatusBar, Modal, Animated, Alert, ScrollView } from 'react-native';
// SafeAreaView from react-native is deprecated; this one handles notches
// and the Android gesture bar correctly.
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, SHADOWS } from '../../../theme';
import pharmacyService from '../services/pharmacyService';
import { useTheme } from "../../../context/ThemeContext";
import { BOTTOM_INSET } from '../../../utils/bottomInset';
const {
  width,
  height
} = Dimensions.get('window');

// Responsive sizing
const wp = percentage => width * percentage / 100;
const hp = percentage => height * percentage / 100;
const MedicineListScreen = ({
  navigation
}) => {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [categories, setCategories] = useState(['All']);
  const [medicines, setMedicines] = useState([]);
  const [loadingMeds, setLoadingMeds] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await pharmacyService.getMedicines(search, selectedCategory);
        if (active && res?.medicines) {
          setMedicines(res.medicines.map(m => ({
            id: m._id,
            name: m.name,
            category: m.category,
            price: m.price,
            inStock: m.inStock,
            prescriptionRequired: m.prescriptionRequired
          })));
          if (res.categories) setCategories(res.categories);
        }
      } catch (e) {/* keep */} finally {
        if (active) setLoadingMeds(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [search, selectedCategory]);
  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(search.toLowerCase()) || (med.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const addToCart = (medicine, qty = 1) => {
    const existingItem = cart.find(item => item.id === medicine.id);
    if (existingItem) {
      setCart(cart.map(item => item.id === medicine.id ? {
        ...item,
        quantity: item.quantity + qty
      } : item));
    } else {
      setCart([...cart, {
        ...medicine,
        quantity: qty
      }]);
    }
    Animated.sequence([Animated.timing(scaleAnim, {
      toValue: 1.2,
      duration: 100,
      useNativeDriver: true
    }), Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true
    })]).start();
    Alert.alert('Added to Cart', `${medicine.name} added to your cart`);
  };
  const removeFromCart = id => {
    setCart(cart.filter(item => item.id !== id));
  };
  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return;
    }
    setCart(cart.map(item => item.id === id ? {
      ...item,
      quantity: newQuantity
    } : item));
  };
  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };
  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };
  const proceedToCheckout = () => {
    setShowCartModal(false);
    // Place the order on the backend right away (real order).
    (async () => {
      try {
        const items = cart.map(c => ({
          medicineId: c.id,
          quantity: c.quantity || c.qty || 1
        }));
        const res = await pharmacyService.placeOrder({
          items,
          deliveryType: 'pickup'
        });
        if (res?.order) {
          setCart([]);
          Alert.alert('Order Placed', `Your order of ₨ ${res.order.totalAmount} has been placed successfully. You will be notified when it's ready.`);
        } else {
          Alert.alert('Error', res?.message || 'Could not place order.');
        }
      } catch (e) {
        Alert.alert('Order Failed', e.message || 'Could not place order. Please try again.');
      }
    })();
  };
  const openMedicineModal = medicine => {
    setSelectedMedicine(medicine);
    setQuantity(1);
  };
  const getStockColor = stock => {
    return stock === 'In Stock' ? COLORS.success : COLORS.warning;
  };
  const getStockBg = stock => {
    return stock === 'In Stock' ? COLORS.success + '20' : COLORS.warning + '20';
  };
  const CategoryFilter = () => <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll} style={styles.filterContainer}>
        {categories.map((cat, index) => <TouchableOpacity key={index} style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]} onPress={() => setSelectedCategory(cat)}>
            <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>)}
      </ScrollView>
    </View>;
  const renderMedicineCard = ({
    item
  }) => <TouchableOpacity style={[styles.medicineCard, styles.cardShadow]} activeOpacity={0.9} onPress={() => openMedicineModal(item)}>
      <View style={styles.cardContent}>
        <View style={styles.medicineIcon}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.iconGradient}>
            <Ionicons name="medkit" size={wp(6)} color={COLORS.white} />
          </LinearGradient>
          {item.prescription && <View style={styles.rxOverlay}>
              <Text style={styles.rxOverlayText}>Rx</Text>
            </View>}
        </View>

        <View style={styles.medicineInfo}>
          <Text style={styles.medicineName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.medicineCategory}>{item.category}</Text>
          <Text style={styles.manufacturer}>{item.manufacturer}</Text>
          
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={wp(3)} color="#FFB800" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.soldText}>({item.sold})</Text>
          </View>

          <View style={styles.stockRow}>
            <View style={[styles.stockBadge, {
            backgroundColor: getStockBg(item.stock)
          }]}>
              <Ionicons name={item.stock === 'In Stock' ? 'checkmark-circle' : 'alert-circle'} size={wp(2.5)} color={getStockColor(item.stock)} />
              <Text style={[styles.stockText, {
              color: getStockColor(item.stock)
            }]}>{item.stock}</Text>
            </View>
          </View>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.price}>₨ {item.price}</Text>
          <Text style={styles.unitPrice}>/{item.unit}</Text>
          <Animated.View style={{
          transform: [{
            scale: scaleAnim
          }]
        }}>
            <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item, 1)}>
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.addGradient}>
                <Ionicons name="add" size={wp(4.5)} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </TouchableOpacity>;
  const CartModal = () => <Modal visible={showCartModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, styles.cardShadow]}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Your Cart ({getCartItemCount()} items)</Text>
            <TouchableOpacity onPress={() => setShowCartModal(false)}>
              <Ionicons name="close" size={wp(7)} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>

          {cart.length === 0 ? <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={wp(18)} color={COLORS.border} />
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
              <TouchableOpacity style={styles.continueBtn} onPress={() => setShowCartModal(false)}>
                <Text style={styles.continueBtnText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View> : <>
              <FlatList data={cart} keyExtractor={item => item.id} contentContainerStyle={styles.cartList} renderItem={({
            item
          }) => <View style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>₨ {item.price} x {item.quantity}</Text>
                    </View>
                    <View style={styles.cartItemActions}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Ionicons name="remove" size={wp(3.5)} color={COLORS.white} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Ionicons name="add" size={wp(3.5)} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.cartItemTotal}>₨ {item.price * item.quantity}</Text>
                      <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                        <Ionicons name="trash-outline" size={wp(5)} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>} />
              
              <View style={styles.cartFooter}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalAmount}>₨ {getCartTotal()}</Text>
                </View>
                <TouchableOpacity style={styles.checkoutBtn} onPress={proceedToCheckout}>
                  <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.checkoutGradient}>
                    <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                    <Ionicons name="arrow-forward" size={wp(4)} color={COLORS.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>}
        </View>
      </View>
    </Modal>;
  const MedicineDetailModal = () => <Modal visible={!!selectedMedicine} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.detailModalContainer, styles.cardShadow]}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.detailModalHeader}>
            <Text style={styles.detailModalTitle}>Medicine Details</Text>
            <TouchableOpacity onPress={() => setSelectedMedicine(null)}>
              <Ionicons name="close" size={wp(7)} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>

          {selectedMedicine && <ScrollView style={styles.detailContent}>
              <View style={styles.detailIconSection}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.detailIcon}>
                  <Ionicons name="medkit" size={wp(10)} color={COLORS.white} />
                </LinearGradient>
              </View>

              <Text style={styles.detailName}>{selectedMedicine.name}</Text>
              <Text style={styles.detailCategory}>{selectedMedicine.category}</Text>
              <Text style={styles.detailManufacturer}>by {selectedMedicine.manufacturer}</Text>

              <View style={styles.detailStats}>
                <View style={styles.detailStat}>
                  <Ionicons name="star" size={wp(4)} color="#FFB800" />
                  <Text style={styles.detailStatValue}>{selectedMedicine.rating}</Text>
                  <Text style={styles.detailStatLabel}>Rating</Text>
                </View>
                <View style={styles.detailStat}>
                  <Ionicons name="people" size={wp(4)} color={COLORS.primary} />
                  <Text style={styles.detailStatValue}>{selectedMedicine.sold}</Text>
                  <Text style={styles.detailStatLabel}>Sold</Text>
                </View>
                <View style={styles.detailStat}>
                  <Ionicons name="calendar" size={wp(4)} color={COLORS.warning} />
                  <Text style={styles.detailStatValue}>{selectedMedicine.expiry}</Text>
                  <Text style={styles.detailStatLabel}>Expiry</Text>
                </View>
              </View>

              <View style={styles.detailInfo}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price:</Text>
                  <Text style={styles.detailValue}>₨ {selectedMedicine.price} / {selectedMedicine.unit}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Stock:</Text>
                  <View style={[styles.stockBadgeLarge, {
                backgroundColor: getStockBg(selectedMedicine.stock)
              }]}>
                    <Text style={[styles.stockTextLarge, {
                  color: getStockColor(selectedMedicine.stock)
                }]}>{selectedMedicine.stock}</Text>
                  </View>
                </View>
                {selectedMedicine.prescription && <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Prescription:</Text>
                    <View style={styles.rxRequiredBadge}>
                      <Ionicons name="document-text" size={wp(3)} color={COLORS.danger} />
                      <Text style={styles.rxRequiredText}>Rx Required</Text>
                    </View>
                  </View>}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Form:</Text>
                  <Text style={styles.detailValue}>{selectedMedicine.unit}</Text>
                </View>
              </View>

              <View style={styles.quantitySelector}>
                <Text style={styles.quantityLabel}>Quantity:</Text>
                <View style={styles.quantityControlsLarge}>
                  <TouchableOpacity style={styles.qtyBtnLarge} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Ionicons name="remove" size={wp(4)} color={COLORS.white} />
                  </TouchableOpacity>
                  <Text style={styles.qtyTextLarge}>{quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtnLarge} onPress={() => setQuantity(quantity + 1)}>
                    <Ionicons name="add" size={wp(4)} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.addToCartBtn} onPress={() => {
            addToCart(selectedMedicine, quantity);
            setSelectedMedicine(null);
          }}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.addToCartGradient}>
                  <Ionicons name="cart" size={wp(4.5)} color={COLORS.white} />
                  <Text style={styles.addToCartBtnText}>Add to Cart (₨ {selectedMedicine.price * quantity})</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>}
        </View>
      </View>
    </Modal>;
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      
      <LinearGradient colors={[COLORS.primary, COLORS.secondary, COLORS.background]} start={{
      x: 0,
      y: 0
    }} end={{
      x: 0,
      y: 0.25
    }} style={styles.gradientBackground} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <View style={styles.topHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={wp(5.5)} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pharmacy</Text>
            <TouchableOpacity style={styles.cartBtn} onPress={() => setShowCartModal(true)}>
              <Ionicons name="cart-outline" size={wp(5)} color={COLORS.white} />
              {getCartItemCount() > 0 && <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
                </View>}
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeBanner}>
            <Text style={styles.welcomeTitle}>💊 Online Medicine Delivery</Text>
            <Text style={styles.welcomeSub}>Free delivery on orders above ₨ 1000</Text>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={wp(4.5)} color={COLORS.textSecondary} />
            <TextInput style={styles.searchInput} placeholder="Search medicines..." placeholderTextColor={COLORS.textLight} value={search} onChangeText={setSearch} />
          </View>
        </View>

        <CategoryFilter />

        <FlatList data={filteredMedicines} keyExtractor={item => item.id} renderItem={renderMedicineCard} numColumns={2} showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridContainer} ListEmptyComponent={<View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={wp(12)} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No Medicines Found</Text>
              <Text style={styles.emptySubtitle}>Try searching with different keywords</Text>
            </View>} />

        {getCartItemCount() > 0 && <TouchableOpacity style={styles.floatingCart} onPress={() => setShowCartModal(true)}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.floatingCartGradient}>
              <Ionicons name="cart-outline" size={wp(5)} color={COLORS.white} />
              <Text style={styles.floatingCartText}>{getCartItemCount()} items (₨ {getCartTotal()})</Text>
              <Ionicons name="arrow-forward" size={wp(4.5)} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>}
      </SafeAreaView>

      <CartModal />
      <MedicineDetailModal />
    </View>;
};
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%'
  },
  safeArea: {
    flex: 1
  },
  cardShadow: {
    ...SHADOWS.medium
  },
  // Header
  headerContainer: {
    paddingBottom: hp(1)
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingTop: Platform.OS === 'ios' ? hp(1) : StatusBar.currentHeight + hp(1),
    paddingBottom: hp(1.5)
  },
  backBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  cartBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  cartBadge: {
    position: 'absolute',
    top: -wp(1),
    right: -wp(1),
    backgroundColor: COLORS.danger,
    borderRadius: wp(3),
    minWidth: wp(4.5),
    height: wp(4.5),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(1)
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: wp(2.5),
    fontWeight: 'bold'
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: wp(5),
    fontWeight: 'bold'
  },
  welcomeBanner: {
    marginHorizontal: wp(5),
    marginTop: hp(1.5),
    marginBottom: hp(1),
    padding: wp(3),
    backgroundColor: COLORS.primary + '50',
    borderRadius: wp(3),
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary
  },
  welcomeTitle: {
    color: COLORS.navy,
    fontSize: wp(3.8),
    fontWeight: 'bold'
  },
  welcomeSub: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    marginTop: hp(0.3)
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: wp(5),
    marginTop: hp(1),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.3),
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: wp(2.5),
    ...SHADOWS.small
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: wp(3.5),
    paddingVertical: hp(1.2)
  },
  filterContainer: {
    maxHeight: hp(7),
    marginVertical: hp(1)
  },
  filterScroll: {
    paddingHorizontal: wp(4),
    gap: wp(2)
  },
  filterChip: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: wp(5),
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small
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
  gridContainer: {
    paddingVertical: hp(1.5),
    paddingBottom: hp(12)
  },
  medicineCard: {
    width: (wp(100) - wp(10)) / 2,
    marginBottom: hp(1.5),
    marginHorizontal: wp(1.5),
    borderRadius: wp(4),
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardContent: {
    padding: wp(3),
    gap: hp(0.8)
  },
  medicineIcon: {
    alignItems: 'center',
    marginBottom: hp(0.5),
    position: 'relative'
  },
  iconGradient: {
    width: wp(13),
    height: wp(13),
    borderRadius: wp(3.5),
    justifyContent: 'center',
    alignItems: 'center'
  },
  rxOverlay: {
    position: 'absolute',
    top: -wp(0.5),
    right: wp(1.5),
    backgroundColor: COLORS.danger,
    paddingHorizontal: wp(1.5),
    paddingVertical: wp(0.5),
    borderRadius: wp(2.5)
  },
  rxOverlayText: {
    color: COLORS.white,
    fontSize: wp(2),
    fontWeight: 'bold'
  },
  medicineInfo: {
    gap: hp(0.3)
  },
  medicineName: {
    fontSize: wp(3.5),
    fontWeight: 'bold',
    color: COLORS.text,
    lineHeight: wp(4.5)
  },
  medicineCategory: {
    fontSize: wp(2.5),
    color: COLORS.textSecondary
  },
  manufacturer: {
    fontSize: wp(2.2),
    color: COLORS.textLight
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1)
  },
  ratingText: {
    fontSize: wp(2.5),
    color: COLORS.text,
    fontWeight: '600'
  },
  soldText: {
    fontSize: wp(2.2),
    color: COLORS.textLight
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.3)
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.3),
    borderRadius: wp(2),
    gap: wp(0.5)
  },
  stockText: {
    fontSize: wp(2.2),
    fontWeight: '600'
  },
  priceSection: {
    alignItems: 'center',
    marginTop: hp(0.5)
  },
  price: {
    fontSize: wp(4.5),
    fontWeight: 'bold',
    color: COLORS.primary
  },
  unitPrice: {
    fontSize: wp(2),
    color: COLORS.textLight,
    marginBottom: hp(0.5)
  },
  addButton: {
    marginTop: hp(0.3)
  },
  addGradient: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(10)
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: wp(4),
    fontWeight: 'bold',
    marginTop: hp(2)
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: wp(3.2),
    marginTop: hp(1)
  },
  floatingCart: {
    position: 'absolute',
    bottom: hp(2) + BOTTOM_INSET,
    left: wp(5),
    right: wp(5),
    borderRadius: wp(6),
    overflow: 'hidden',
    ...SHADOWS.large
  },
  floatingCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5)
  },
  floatingCartText: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderRadius: wp(5),
    width: wp(92),
    maxHeight: hp(85),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border
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
  emptyCart: {
    alignItems: 'center',
    paddingVertical: hp(6)
  },
  emptyCartText: {
    color: COLORS.textSecondary,
    fontSize: wp(3.5),
    marginTop: hp(1.5)
  },
  continueBtn: {
    marginTop: hp(2),
    padding: wp(3),
    backgroundColor: COLORS.primary + '10',
    borderRadius: wp(3)
  },
  continueBtnText: {
    color: COLORS.primary,
    fontSize: wp(3.2),
    fontWeight: '600'
  },
  cartList: {
    padding: wp(3)
  },
  cartItem: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: wp(3),
    padding: wp(3),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cartItemInfo: {
    marginBottom: hp(0.8)
  },
  cartItemName: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: 'bold'
  },
  cartItemPrice: {
    color: COLORS.textSecondary,
    fontSize: wp(2.8),
    marginTop: hp(0.3)
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2)
  },
  qtyBtn: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(2),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyText: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: 'bold',
    width: wp(6),
    textAlign: 'center'
  },
  cartItemTotal: {
    color: COLORS.primary,
    fontSize: wp(3.5),
    fontWeight: 'bold'
  },
  cartFooter: {
    padding: wp(4),
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1.5)
  },
  totalLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(3.5)
  },
  totalAmount: {
    color: COLORS.primary,
    fontSize: wp(4.5),
    fontWeight: 'bold'
  },
  checkoutBtn: {
    borderRadius: wp(3),
    overflow: 'hidden'
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(3),
    gap: wp(2)
  },
  checkoutBtnText: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: 'bold'
  },
  detailModalContainer: {
    backgroundColor: COLORS.card,
    borderRadius: wp(5),
    width: wp(92),
    maxHeight: hp(85),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(4)
  },
  detailModalTitle: {
    color: COLORS.white,
    fontSize: wp(4.5),
    fontWeight: 'bold'
  },
  detailContent: {
    padding: wp(4)
  },
  detailIconSection: {
    alignItems: 'center',
    marginBottom: hp(2)
  },
  detailIcon: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(4.5),
    justifyContent: 'center',
    alignItems: 'center'
  },
  detailName: {
    color: COLORS.text,
    fontSize: wp(5),
    fontWeight: 'bold',
    textAlign: 'center'
  },
  detailCategory: {
    color: COLORS.textSecondary,
    fontSize: wp(3.2),
    textAlign: 'center',
    marginTop: hp(0.3)
  },
  detailManufacturer: {
    color: COLORS.textLight,
    fontSize: wp(2.8),
    textAlign: 'center',
    marginTop: hp(0.2)
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: hp(2),
    padding: wp(3.5),
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: wp(3.5)
  },
  detailStat: {
    alignItems: 'center',
    gap: hp(0.3)
  },
  detailStatValue: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: 'bold'
  },
  detailStatLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(2.5)
  },
  detailInfo: {
    gap: hp(1),
    marginBottom: hp(2)
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2)
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: wp(3),
    width: wp(25)
  },
  detailValue: {
    color: COLORS.text,
    fontSize: wp(3),
    fontWeight: '500'
  },
  stockBadgeLarge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: wp(2.5)
  },
  stockTextLarge: {
    fontSize: wp(2.8),
    fontWeight: '600'
  },
  rxRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    backgroundColor: COLORS.danger + '20',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: wp(2.5)
  },
  rxRequiredText: {
    color: COLORS.danger,
    fontSize: wp(2.8),
    fontWeight: '600'
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(2),
    paddingTop: hp(1),
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  quantityLabel: {
    color: COLORS.text,
    fontSize: wp(3.5),
    fontWeight: '600'
  },
  quantityControlsLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.5)
  },
  qtyBtnLarge: {
    width: wp(9.5),
    height: wp(9.5),
    borderRadius: wp(3),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyTextLarge: {
    color: COLORS.text,
    fontSize: wp(4),
    fontWeight: 'bold',
    width: wp(8),
    textAlign: 'center'
  },
  addToCartBtn: {
    borderRadius: wp(3),
    overflow: 'hidden',
    marginBottom: hp(1.5)
  },
  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(3.5),
    gap: wp(2)
  },
  addToCartBtnText: {
    color: COLORS.white,
    fontSize: wp(3.5),
    fontWeight: 'bold'
  }
});
export default MedicineListScreen;