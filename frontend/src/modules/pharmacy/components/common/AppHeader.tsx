import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";
import Logo from "../../assets/images/logoo.png";
import LogoDark from "../../assets/images/logoo-dark.png";
import { useTheme } from "../../Theme/themeContext";
import { useState, useEffect, useCallback } from "react";
import pharmacyService from "../../services/pharmacyService";
import { onPharmacyUpdate } from "../../../../services/socket";
import { topPad } from '../../../../utils/safeArea';

interface Props {
  onMenuPress: () => void;
}

export default function AppHeader({
  onMenuPress,
}: Props) {
const navigation = useNavigation<any>();
const { theme, isDark } = useTheme();
const [unread, setUnread] = useState(0);

const loadUnread = useCallback(async () => {
  try {
    const res = await pharmacyService.getMyNotifications();
    const n = typeof res?.unread === "number" ? res.unread : (res?.notifications || []).filter((x: any) => !x.read).length;
    setUnread(n);
  } catch (e) { /* offline */ }
}, []);

useEffect(() => {
  loadUnread();
  const unsubFocus = navigation.addListener("focus", loadUnread);
  const unsub = onPharmacyUpdate(() => loadUnread());
  return () => { unsubFocus && unsubFocus(); unsub && unsub(); };
}, [loadUnread, navigation]);

return (
  <View
    style={[
      styles.container,
      {
        backgroundColor: theme.colors.background,
      },
    ]}
  >

    {/* Top Row */}
    <View style={styles.topBar}>

      <TouchableOpacity onPress={onMenuPress}>
        <Ionicons
          name="menu"
          size={30}
          color={theme.colors.primary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.notificationButton}
        onPress={() => navigation.navigate("Notifications")}
      >
        <Ionicons
          name="notifications-outline"
          size={26}
          color={theme.colors.primary}
        />

        {unread > 0 && (
          <View
            style={[
              styles.notificationDot,
              {
                borderColor: theme.colors.background,
              },
            ]}
          >
            <Text style={styles.notificationCount}>{unread > 99 ? "99+" : unread}</Text>
          </View>
        )}
      </TouchableOpacity>

    </View>

    {/* Logo & Title */}
    <View style={styles.headerContent}>

      <View
        style={[
          styles.logoCircle,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.primary,
          },
        ]}
      >
        <Image
          source={isDark ? LogoDark : Logo}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.text,
          },
        ]}
      >
        SEHATLINE
      </Text>

      <Text
        style={[
          styles.subTitle,
          {
            color: theme.colors.textSecondary,
          },
        ]}
      >
        CDA Hospital Pharmacy
      </Text>

    </View>

  </View>
);
}

const styles = StyleSheet.create({

container: {
  marginTop: topPad(40),
  marginBottom: 25,
},

topBar: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

headerContent: {
  alignItems: "center",
  marginTop: 6,
},


side: {
  width: 50,
  alignItems: "center",
  justifyContent: "center",
},
titleContainer: {
  flex: 1,
  alignItems: "center",
},

title: {
  fontSize: 22,
  fontWeight: "800",

  letterSpacing: 1,
},

subTitle: {
  marginTop: 2,
  fontSize: 12,
  
  fontWeight: "500",
},

rightIcons: {
  position: "absolute",
  right: 0,
  top: 8,
  flexDirection: "row",
  alignItems: "center",
},

logoCircle: {
  width: 70,
  height: 70,
  borderRadius: 60,

 

  borderWidth: 3,
  

  justifyContent: "center",
  alignItems: "center",

  marginBottom: 15,
},

logo: {
  width: 50,
  height: 50,
},

iconButton: {
  padding: 6,
},
notificationButton: {
  padding: 6,
  position: "relative",
},

notificationDot: {
  position: "absolute",
  top: -4,
  right: -6,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  paddingHorizontal: 4,
  backgroundColor: "#EF4444",
  borderWidth: 2,
  alignItems: "center",
  justifyContent: "center",
},
notificationCount: {
  color: "#FFFFFF",
  fontSize: 10,
  fontWeight: "800",
},

});