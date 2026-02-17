import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// MedConnect Design System 2.0
/// Professional medical app theme with clean, trustworthy aesthetics
/// Primary: Deep Medical Blue (#0D47A1) - conveys trust and professionalism
/// Secondary: Teal (#00897B) - healthcare associated color
/// Accent: Soft Coral (#FF7043) - warmth and human connection

class MedConnectColors {
  // Primary - Deep Medical Blue
  static const Color primary = Color(0xFF0D47A1);
  static const Color primaryHover = Color(0xFF0A3880);
  static const Color primaryLight = Color(0xFFE3F2FD);
  static const Color primaryForeground = Color(0xFFFFFFFF);

  // Secondary - Healthcare Teal
  static const Color secondary = Color(0xFF00897B);
  static const Color secondaryHover = Color(0xFF00695C);
  static const Color secondaryLight = Color(0xFFE0F2F1);
  static const Color secondaryForeground = Color(0xFFFFFFFF);

  // Accent - Warm Coral
  static const Color accent = Color(0xFFFF7043);
  static const Color accentHover = Color(0xFFF4511E);
  static const Color accentLight = Color(0xFFFFE0D6);
  static const Color accentForeground = Color(0xFFFFFFFF);

  // Neutral Scale
  static const Color neutral50 = Color(0xFFFAFAFA);
  static const Color neutral100 = Color(0xFFF5F5F5);
  static const Color neutral200 = Color(0xFFEEEEEE);
  static const Color neutral300 = Color(0xFFE0E0E0);
  static const Color neutral400 = Color(0xFFBDBDBD);
  static const Color neutral500 = Color(0xFF9E9E9E);
  static const Color neutral600 = Color(0xFF757575);
  static const Color neutral700 = Color(0xFF616161);
  static const Color neutral800 = Color(0xFF424242);
  static const Color neutral900 = Color(0xFF212121);

  // Semantic Colors
  static const Color success = Color(0xFF43A047);
  static const Color successLight = Color(0xFFE8F5E9);
  static const Color warning = Color(0xFFFFA726);
  static const Color warningLight = Color(0xFFFFF3E0);
  static const Color error = Color(0xFFE53935);
  static const Color errorLight = Color(0xFFFFEBEE);
  static const Color info = Color(0xFF1E88E5);
  static const Color infoLight = Color(0xFFE3F2FD);

  // Background & Surface
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF1F5F9);
  static const Color card = Color(0xFFFFFFFF);

  // Border & Divider
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderLight = Color(0xFFF1F5F9);
  static const Color divider = Color(0xFFE2E8F0);

  // Text
  static const Color textPrimary = Color(0xFF1E293B);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textTertiary = Color(0xFF94A3B8);
  static const Color textInverse = Color(0xFFFFFFFF);

  // Input
  static const Color inputBackground = Color(0xFFFFFFFF);
  static const Color inputBorder = Color(0xFFE2E8F0);
  static const Color inputBorderFocused = primary;

  // Shadow
  static const Color shadow = Color(0x1A000000);
  static const Color shadowLight = Color(0x0D000000);

  // Overlay
  static const Color overlay = Color(0x80000000);
  static const Color overlayLight = Color(0x40000000);

  // Skeleton/Loading
  static const Color skeleton = Color(0xFFE2E8F0);
  static const Color skeletonHighlight = Color(0xFFF8FAFC);
}

class MedConnectRadius {
  static const double none = 0;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double full = 9999;
}

class MedConnectSpacing {
  static const double xxs = 2;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
  static const double xxxxl = 48;
  static const double xxxxxl = 64;
}

class MedConnectTextStyles {
  // Display
  static TextStyle get displayLarge => GoogleFonts.inter(
    fontSize: 48,
    fontWeight: FontWeight.w700,
    height: 1.1,
    letterSpacing: -0.02,
    color: MedConnectColors.textPrimary,
  );

  static TextStyle get displayMedium => GoogleFonts.inter(
    fontSize: 36,
    fontWeight: FontWeight.w700,
    height: 1.2,
    letterSpacing: -0.02,
    color: MedConnectColors.textPrimary,
  );

  static TextStyle get displaySmall => GoogleFonts.inter(
    fontSize: 28,
    fontWeight: FontWeight.w600,
    height: 1.25,
    letterSpacing: -0.01,
    color: MedConnectColors.textPrimary,
  );

  // Headings
  static TextStyle get headingLarge => GoogleFonts.inter(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    height: 1.3,
    letterSpacing: -0.01,
    color: MedConnectColors.textPrimary,
  );

  static TextStyle get headingMedium => GoogleFonts.inter(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    height: 1.35,
    color: MedConnectColors.textPrimary,
  );

  static TextStyle get headingSmall => GoogleFonts.inter(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    height: 1.4,
    color: MedConnectColors.textPrimary,
  );

  // Titles
  static TextStyle get titleLarge => GoogleFonts.inter(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 1.45,
    color: MedConnectColors.textPrimary,
  );

  static TextStyle get titleMedium => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.5,
    color: MedConnectColors.textPrimary,
  );

  static TextStyle get titleSmall => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    height: 1.5,
    color: MedConnectColors.textSecondary,
  );

  // Body
  static TextStyle get bodyLarge => GoogleFonts.inter(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.6,
    color: MedConnectColors.textPrimary,
  );

  static TextStyle get bodyMedium => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.6,
    color: MedConnectColors.textPrimary,
  );

  static TextStyle get bodySmall => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.5,
    color: MedConnectColors.textSecondary,
  );

  // Labels
  static TextStyle get labelLarge => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    height: 1.4,
    color: MedConnectColors.textPrimary,
  );

  static TextStyle get labelMedium => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    height: 1.4,
    color: MedConnectColors.textSecondary,
  );

  static TextStyle get labelSmall => GoogleFonts.inter(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    height: 1.4,
    letterSpacing: 0.02,
    color: MedConnectColors.textTertiary,
  );

  // Button
  static TextStyle get buttonLarge => GoogleFonts.inter(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 1.4,
    color: MedConnectColors.primaryForeground,
  );

  static TextStyle get buttonMedium => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.4,
    color: MedConnectColors.primaryForeground,
  );

  static TextStyle get buttonSmall => GoogleFonts.inter(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    height: 1.4,
    color: MedConnectColors.primaryForeground,
  );

  // Special
  static TextStyle get caption => GoogleFonts.inter(
    fontSize: 11,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: MedConnectColors.textTertiary,
  );

  static TextStyle get overline => GoogleFonts.inter(
    fontSize: 10,
    fontWeight: FontWeight.w700,
    height: 1.4,
    letterSpacing: 0.12,
    color: MedConnectColors.textTertiary,
  );
}

class MedConnectShadows {
  static List<BoxShadow> get xs => [
    BoxShadow(
      color: MedConnectColors.shadowLight,
      blurRadius: 2,
      offset: const Offset(0, 1),
    ),
  ];

  static List<BoxShadow> get sm => [
    BoxShadow(
      color: MedConnectColors.shadowLight,
      blurRadius: 4,
      offset: const Offset(0, 2),
    ),
  ];

  static List<BoxShadow> get md => [
    BoxShadow(
      color: MedConnectColors.shadow,
      blurRadius: 8,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get lg => [
    BoxShadow(
      color: MedConnectColors.shadow,
      blurRadius: 16,
      offset: const Offset(0, 8),
    ),
  ];

  static List<BoxShadow> get xl => [
    BoxShadow(
      color: MedConnectColors.shadow,
      blurRadius: 24,
      offset: const Offset(0, 16),
    ),
  ];

  static List<BoxShadow> get glowPrimary => [
    BoxShadow(
      color: MedConnectColors.primary.withAlpha(51),
      blurRadius: 16,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get glowSecondary => [
    BoxShadow(
      color: MedConnectColors.secondary.withAlpha(51),
      blurRadius: 16,
      offset: const Offset(0, 4),
    ),
  ];
}

class MedConnectDurations {
  static const Duration instant = Duration(milliseconds: 50);
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 250);
  static const Duration slow = Duration(milliseconds: 350);
  static const Duration slower = Duration(milliseconds: 500);
}

class MedConnectCurves {
  static const Curve standard = Curves.easeInOut;
  static const Curve enter = Curves.easeOutCubic;
  static const Curve exit = Curves.easeInCubic;
  static const Curve bounce = Curves.elasticOut;
  static const Curve smooth = Curves.fastOutSlowIn;
}

class MedConnectTheme {
  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.light(
        primary: MedConnectColors.primary,
        onPrimary: MedConnectColors.primaryForeground,
        secondary: MedConnectColors.secondary,
        onSecondary: MedConnectColors.secondaryForeground,
        tertiary: MedConnectColors.accent,
        onTertiary: MedConnectColors.accentForeground,
        error: MedConnectColors.error,
        onError: MedConnectColors.textInverse,
        surface: MedConnectColors.surface,
        onSurface: MedConnectColors.textPrimary,
        surfaceContainerHighest: MedConnectColors.surfaceVariant,
        outline: MedConnectColors.border,
        shadow: MedConnectColors.shadow,
      ),
      scaffoldBackgroundColor: MedConnectColors.background,
      textTheme: TextTheme(
        displayLarge: MedConnectTextStyles.displayLarge,
        displayMedium: MedConnectTextStyles.displayMedium,
        displaySmall: MedConnectTextStyles.displaySmall,
        headlineLarge: MedConnectTextStyles.headingLarge,
        headlineMedium: MedConnectTextStyles.headingMedium,
        headlineSmall: MedConnectTextStyles.headingSmall,
        titleLarge: MedConnectTextStyles.titleLarge,
        titleMedium: MedConnectTextStyles.titleMedium,
        titleSmall: MedConnectTextStyles.titleSmall,
        bodyLarge: MedConnectTextStyles.bodyLarge,
        bodyMedium: MedConnectTextStyles.bodyMedium,
        bodySmall: MedConnectTextStyles.bodySmall,
        labelLarge: MedConnectTextStyles.labelLarge,
        labelMedium: MedConnectTextStyles.labelMedium,
        labelSmall: MedConnectTextStyles.labelSmall,
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: MedConnectColors.surface,
        foregroundColor: MedConnectColors.textPrimary,
        centerTitle: true,
        titleTextStyle: MedConnectTextStyles.headingSmall,
        iconTheme: const IconThemeData(
          color: MedConnectColors.textPrimary,
          size: 24,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: MedConnectColors.card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MedConnectRadius.lg),
          side: const BorderSide(color: MedConnectColors.border, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: MedConnectColors.primary,
          foregroundColor: MedConnectColors.primaryForeground,
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(MedConnectRadius.md),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: MedConnectSpacing.xl,
            vertical: MedConnectSpacing.lg,
          ),
          textStyle: MedConnectTextStyles.buttonMedium,
          minimumSize: const Size(44, 44),
        ).copyWith(
          overlayColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) {
              return MedConnectColors.primaryHover.withAlpha(30);
            }
            return null;
          }),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: MedConnectColors.primary,
          foregroundColor: MedConnectColors.primaryForeground,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(MedConnectRadius.md),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: MedConnectSpacing.xl,
            vertical: MedConnectSpacing.lg,
          ),
          textStyle: MedConnectTextStyles.buttonMedium,
          minimumSize: const Size(44, 44),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: MedConnectColors.primary,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(MedConnectRadius.md),
          ),
          side: const BorderSide(color: MedConnectColors.border, width: 1.5),
          padding: const EdgeInsets.symmetric(
            horizontal: MedConnectSpacing.xl,
            vertical: MedConnectSpacing.lg,
          ),
          textStyle: MedConnectTextStyles.buttonMedium.copyWith(
            color: MedConnectColors.primary,
          ),
          minimumSize: const Size(44, 44),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: MedConnectColors.primary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(MedConnectRadius.md),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: MedConnectSpacing.md,
            vertical: MedConnectSpacing.sm,
          ),
          textStyle: MedConnectTextStyles.labelLarge.copyWith(
            color: MedConnectColors.primary,
          ),
          minimumSize: const Size(44, 44),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: MedConnectColors.inputBackground,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(MedConnectRadius.md),
          borderSide: const BorderSide(color: MedConnectColors.inputBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(MedConnectRadius.md),
          borderSide: const BorderSide(color: MedConnectColors.inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(MedConnectRadius.md),
          borderSide: const BorderSide(color: MedConnectColors.inputBorderFocused, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(MedConnectRadius.md),
          borderSide: const BorderSide(color: MedConnectColors.error),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: MedConnectSpacing.lg,
          vertical: MedConnectSpacing.lg,
        ),
        hintStyle: MedConnectTextStyles.bodyMedium.copyWith(
          color: MedConnectColors.textTertiary,
        ),
        labelStyle: MedConnectTextStyles.bodyMedium.copyWith(
          color: MedConnectColors.textSecondary,
        ),
        errorStyle: MedConnectTextStyles.bodySmall.copyWith(
          color: MedConnectColors.error,
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: MedConnectColors.surface,
        selectedItemColor: MedConnectColors.primary,
        unselectedItemColor: MedConnectColors.textTertiary,
        selectedLabelStyle: MedConnectTextStyles.labelSmall.copyWith(
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: MedConnectTextStyles.labelSmall,
        elevation: 8,
        type: BottomNavigationBarType.fixed,
        showSelectedLabels: true,
        showUnselectedLabels: true,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: MedConnectColors.surfaceVariant,
        labelStyle: MedConnectTextStyles.labelMedium,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MedConnectRadius.full),
          side: const BorderSide(color: MedConnectColors.border),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: MedConnectSpacing.md,
          vertical: MedConnectSpacing.xs,
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: MedConnectColors.divider,
        thickness: 1,
        space: MedConnectSpacing.lg,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: MedConnectColors.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(MedConnectRadius.xl),
          ),
        ),
        elevation: 16,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: MedConnectColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MedConnectRadius.lg),
        ),
        elevation: 24,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: MedConnectColors.neutral800,
        contentTextStyle: MedConnectTextStyles.bodyMedium.copyWith(
          color: MedConnectColors.textInverse,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MedConnectRadius.md),
        ),
        behavior: SnackBarBehavior.floating,
        elevation: 6,
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: MedConnectColors.primary,
        foregroundColor: MedConnectColors.primaryForeground,
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MedConnectRadius.full),
        ),
      ),
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: MedConnectSpacing.lg,
          vertical: MedConnectSpacing.sm,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MedConnectRadius.md),
        ),
      ),
      tabBarTheme: TabBarThemeData(
        labelStyle: MedConnectTextStyles.labelLarge.copyWith(
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: MedConnectTextStyles.labelLarge,
        labelColor: MedConnectColors.primary,
        unselectedLabelColor: MedConnectColors.textSecondary,
        indicator: BoxDecoration(
          borderRadius: BorderRadius.circular(MedConnectRadius.md),
          color: MedConnectColors.primaryLight,
        ),
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: MedConnectColors.neutral800,
          borderRadius: BorderRadius.circular(MedConnectRadius.sm),
        ),
        textStyle: MedConnectTextStyles.bodySmall.copyWith(
          color: MedConnectColors.textInverse,
        ),
      ),
      splashColor: MedConnectColors.primary.withAlpha(20),
      highlightColor: MedConnectColors.primary.withAlpha(10),
    );
  }

  static ThemeData get dark {
    // Dark theme implementation can be added here
    return light;
  }
}

/// Extension methods for easier theme access
extension ThemeExtension on BuildContext {
  ThemeData get theme => Theme.of(this);
  ColorScheme get colors => theme.colorScheme;
  TextTheme get textTheme => theme.textTheme;
  bool get isDark => theme.brightness == Brightness.dark;
}

// Getter shorthand for theme colors
extension MedConnectThemeExtension on BuildContext {
  // Colors shorthand
  Color get primaryColor => MedConnectColors.primary;
  Color get secondaryColor => MedConnectColors.secondary;
  Color get accentColor => MedConnectColors.accent;
  Color get errorColor => MedConnectColors.error;
  Color get warningColor => MedConnectColors.warning;
  Color get successColor => MedConnectColors.success;
  Color get backgroundColor => MedConnectColors.background;
  Color get surfaceColor => MedConnectColors.surface;
  Color get textPrimaryColor => MedConnectColors.textPrimary;
  Color get textSecondaryColor => MedConnectColors.textSecondary;
}
