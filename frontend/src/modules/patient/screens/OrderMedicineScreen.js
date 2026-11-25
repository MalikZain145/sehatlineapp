import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '../../../components/CustomHeader';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

const OrderMedicineScreen = ({ navigation, route }) => {
  const medicine = route.params?.medicine || {};
  const [quantity, setQuantity] = useState(1);

  const addToCart = () => {
    Alert.alert(
      "Added to Cart",
      `${quantity} × ${medicine.name} added to cart`,
      [
        { text: "Continue Shopping", onPress: () => navigation.goBack() },
        { text: "Go to Cart", onPress: () => navigation.navigate('CartScreen') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Order Medicine" navigation={navigation} />

      <View style={styles.content}>
        <View style={styles.medicineInfo}>
          <Ionicons name="pill" size={80} color="#00D4FF" />
          <Text style={styles.medName}>{medicine.name}</Text>
          <Text style={styles.category}>{medicine.category}</Text>
          <Text style={styles.price}>Rs. {medicine.price} per strip</Text>
        </View>

        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantity</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity 
              style={styles.qtyButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Ionicons name="remove" size={24} color="#1E3A8A" />
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity 
              style={styles.qtyButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Ionicons name="add" size={24} color="#1E3A8A" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>Rs. {(medicine.price * quantity)}</Text>
        </View>

        <TouchableOpacity style={styles.addToCartButton} onPress={addToCart}>
          <Ionicons name="cart" size={24} color="#fff" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingBottom: BOTTOM_SPACE },
  content: { flex: 1, padding: 25, alignItems: 'center' },
  medicineInfo: { alignItems: 'center', marginBottom: 40 },
  medName: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A', marginTop: 15, textAlign: 'center' },
  category: { fontSize: 16, color: '#64748B', marginTop: 5 },
  price: { fontSize: 20, color: '#00D4FF', fontWeight: '600', marginTop: 10 },
  quantityContainer: { width: '100%', marginBottom: 30 },
  quantityLabel: { fontSize: 18, color: '#1E3A8A', marginBottom: 12 },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
  },
  qtyButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  quantity: { fontSize: 28, fontWeight: 'bold', marginHorizontal: 30, color: '#1E3A8A' },
  totalContainer: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 40,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 16, color: '#64748B' },
  totalAmount: { fontSize: 32, fontWeight: 'bold', color: '#00D4FF', marginTop: 8 },
  addToCartButton: {
    backgroundColor: '#00D4FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    width: '100%',
  },
  addToCartText: { color: '#fff', fontSize: 19, fontWeight: 'bold', marginLeft: 12 },
});

export default OrderMedicineScreen;