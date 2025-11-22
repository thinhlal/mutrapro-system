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
      label: 'Home',
      icon: 'home-outline',
      screen: SCREEN_NAMES.HOME,
      onPress: () => navigation.navigate(SCREEN_NAMES.HOME),
    },
    {
      label: 'My Requests',
      icon: 'list-outline',
      screen: SCREEN_NAMES.MY_REQUESTS,
      onPress: () => navigation.navigate(SCREEN_NAMES.HOME),
    },
    {
      label: 'Contracts',
      icon: 'document-text-outline',
      screen: SCREEN_NAMES.MY_CONTRACTS,
      onPress: () => navigation.navigate(SCREEN_NAMES.HOME),
    },
    {
      label: 'Wallet',
      icon: 'wallet-outline',
      screen: SCREEN_NAMES.WALLET,
      onPress: () => navigation.navigate(SCREEN_NAMES.HOME),
    },
    {
      label: 'Profile',
      icon: 'person-outline',
      screen: 'ProfileStack',
      onPress: () => navigation.navigate('ProfileStack'),
    },
    {
      label: 'Settings',
      icon: 'settings-outline',
      screen: SCREEN_NAMES.SETTINGS,
      onPress: () => navigation.navigate(SCREEN_NAMES.HOME),
    },
  ];

  const getCurrentRoute = () => {
    try {
      const state = navigation.getState();
      if (!state || !state.routes) return SCREEN_NAMES.HOME;

      const route = state.routes[state.index];
      if (!route) return SCREEN_NAMES.HOME;

      if (route.state && route.state.routes) {
        if (route.name === 'ProfileStack') {
          return 'ProfileStack';
        }
      }

      return route.name || SCREEN_NAMES.HOME;
    } catch (error) {
      console.error('Error getting current route:', error);
      return SCREEN_NAMES.HOME;
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
            const isActive = currentRoute === item.screen;
            return (
              <TouchableOpacity
                key={item.screen}
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
