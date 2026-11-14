import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';

const CartScreen = ({ navigation }) => {
  const [cartItems, setCartItems] = useState([
    { id: '1', name: 'Amoxicillin 500mg', price: 180, quantity: 2 },
    { id: '2', name: 'Panadol Extra', price: 85, quantity: 3 },
  ]);

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const removeItem = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const placeOrder = () => {
    Alert.alert(
      "Order Placed Successfully",
      `Your order of Rs. ${totalAmount} has been placed.\nDelivery in 2-3 hours.`,
      [{ text: "OK", onPress: () => navigation.navigate('MedicineListScreen') }]
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Your Cart" navigation={navigation} />

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={100} color="#64748B" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.quantity}>Qty: {item.quantity}</Text>
                </View>
                <View style={styles.priceSection}>
                  <Text style={styles.price}>Rs. {item.price * item.quantity}</Text>
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>Rs. {totalAmount}</Text>
          </View>

          <TouchableOpacity style={styles.orderButton} onPress={placeOrder}>
            <Text style={styles.orderButtonText}>Place Order</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 20, color: '#64748B', marginTop: 20 },
  cartItem: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4.2, elevation: 4,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '600', color: '#1E3A8A' },
  quantity: { fontSize: 15, color: '#64748B', marginTop: 6 },
  priceSection: { alignItems: 'flex-end' },
  price: { fontSize: 18, fontWeight: 'bold', color: '#00D4FF' },
  totalSection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5.0, elevation: 5,
  },
  totalLabel: { fontSize: 18, color: '#1E3A8A' },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: '#00D4FF' },
  orderButton: {
    backgroundColor: '#00D4FF',
    margin: 15,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  orderButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});

export default CartScreen;