import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  COLORS,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  SCREEN_NAMES,
} from '../config/constants';

const CustomDrawerContent = (props) => {
  const { user, logout, loading } = useAuth();
  const { navigation } = props;

  const handleLogout = async () => {
    try {
      await logout();
      navigation.closeDrawer();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      icon: 'home-outline',
      screen: 'MainTabs',
      tab: 'Home',
      onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
    },
    {
      id: 'my-requests',
      label: 'My Requests',
      icon: 'list-outline',
      screen: 'MyRequests',
      tab: null,
      onPress: () => navigation.navigate('MyRequests'),
    },
    {
      id: 'contracts',
      label: 'Contracts',
      icon: 'document-text-outline',
      screen: 'MainTabs',
      tab: 'Home',
      onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: 'wallet-outline',
      screen: 'Wallet',
      tab: null,
      onPress: () => navigation.navigate('Wallet'),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'person-outline',
      screen: 'MainTabs',
      tab: 'Profile',
      onPress: () => navigation.navigate('MainTabs', { screen: 'Profile' }),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings-outline',
      screen: 'MainTabs',
      tab: 'Home',
      onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
    },
  ];

  const getCurrentRoute = () => {
    try {
      const state = navigation.getState();
      if (!state || !state.routes) return 'MainTabs';

      const route = state.routes[state.index];
      if (!route) return 'MainTabs';

      return route.name || 'MainTabs';
    } catch (error) {
      console.error('Error getting current route:', error);
      return 'MainTabs';
    }
  };

  const currentRoute = getCurrentRoute();

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Header */}
        <View style={styles.userHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={COLORS.white} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || ''}
            </Text>
          </View>
        </View>

        {/* Section title */}
        {/* <View style={styles.sectionLabelWrapper}>
          <Text style={styles.sectionLabel}>NAVIGATION</Text>
        </View> */}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => {
            // Determine if this item is active
            let isActive = false;
            if (item.screen === 'MyRequests') {
              isActive = currentRoute === 'MyRequests';
            } else if (item.screen === 'Wallet') {
              isActive = currentRoute === 'Wallet';
            } else if (item.screen === 'MainTabs' && item.tab) {
              // For MainTabs items, check if on MainTabs screen
              // In a real app, you'd check the nested route too
              isActive = currentRoute === 'MainTabs' && item.id === 'home'; // Only home is active for now
            }
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => {
                  item.onPress();
                  navigation.closeDrawer();
                }}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isActive ? COLORS.primary : COLORS.text}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      isActive && styles.menuItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isActive ? COLORS.primary : COLORS.mutedText || COLORS.text}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Logout Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Drawer full background
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  // Không padding ở container, cho nội dung tràn full
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
  },

  /* HEADER */

  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.mutedText || '#8C9AAD',
  },

  /* SECTION LABEL */

  sectionLabelWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1,
    fontWeight: '600',
    color: COLORS.mutedText || '#9BA4B5',
  },

  /* MENU LIST */

  menuSection: {
    marginTop: SPACING.md,
    // không margin/padding ngang ngoài, chỉ bên trong item
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    // full width, không bo tròn, không margin ngang
  },
  menuItemActive: {
    backgroundColor: COLORS.primary + '12',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md, // nếu RN < 0.71 không hỗ trợ gap thì thay bằng marginLeft
  },
  menuItemText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
    marginLeft: SPACING.md,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  /* FOOTER / LOGOUT */

  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  logoutText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.error,
    marginLeft: SPACING.sm,
    fontWeight: '600',
  },
});

export default CustomDrawerContent;
