import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:gap/gap.dart';
import '../theme/medconnect_theme.dart';

/// ============================================================================
/// BUTTON - shadcn-inspired button with variants
/// ============================================================================

enum ButtonVariant { primary, secondary, outline, ghost, destructive, success }
enum ButtonSize { sm, md, lg, icon }

class Button extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final ButtonSize size;
  final bool loading;
  final bool disabled;
  final IconData? icon;
  final IconData? trailingIcon;

  const Button({
    super.key,
    required this.text,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.size = ButtonSize.md,
    this.loading = false,
    this.disabled = false,
    this.icon,
    this.trailingIcon,
  });

  @override
  State<Button> createState() => _ButtonState();
}

class _ButtonState extends State<Button> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: MedConnectDurations.normal,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.disabled || widget.loading;
    final colors = _getColors();
    final size = _getSize();

    return GestureDetector(
      onTapDown: isDisabled ? null : (_) => _controller.forward(),
      onTapUp: isDisabled ? null : (_) => _controller.reverse(),
      onTapCancel: isDisabled ? null : () => _controller.reverse(),
      onTap: isDisabled ? null : widget.onPressed,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.scale(
            scale: 1 - (_controller.value * 0.02),
            child: child,
          );
        },
        child: Container(
          padding: size['padding'],
          decoration: BoxDecoration(
            color: colors['bg'],
            border: colors['border'] != null
                ? Border.all(color: colors['border']!)
                : null,
            borderRadius: BorderRadius.circular(MedConnectRadius.md),
            boxShadow: widget.variant == ButtonVariant.primary
                ? [
                    BoxShadow(
                      color: MedConnectColors.primary.withAlpha(51),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (widget.loading)
                SizedBox(
                  width: size['iconSize'],
                  height: size['iconSize'],
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation(colors['fg']),
                  ),
                )
              else if (widget.icon != null) ...[
                Icon(widget.icon, size: size['iconSize'], color: colors['fg']),
                const Gap(8),
              ],
              Text(
                widget.text,
                style: MedConnectTextStyles.buttonMedium.copyWith(
                  color: colors['fg'],
                  fontSize: size['fontSize'],
                ),
              ),
              if (widget.trailingIcon != null && !widget.loading) ...[
                const Gap(8),
                Icon(
                  widget.trailingIcon,
                  size: size['iconSize'],
                  color: colors['fg'],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Map<String, dynamic> _getColors() {
    final isDisabled = widget.disabled || widget.loading;
    switch (widget.variant) {
      case ButtonVariant.primary:
        return {
          'bg': isDisabled ? MedConnectColors.primary.withAlpha(128) : MedConnectColors.primary,
          'fg': MedConnectColors.primaryForeground,
        };
      case ButtonVariant.secondary:
        return {
          'bg': MedConnectColors.secondary,
          'fg': MedConnectColors.secondaryForeground,
        };
      case ButtonVariant.outline:
        return {
          'bg': Colors.transparent,
          'fg': MedConnectColors.textPrimary,
          'border': MedConnectColors.border,
        };
      case ButtonVariant.ghost:
        return {
          'bg': Colors.transparent,
          'fg': MedConnectColors.textPrimary,
        };
      case ButtonVariant.destructive:
        return {
          'bg': MedConnectColors.error,
          'fg': MedConnectColors.textInverse,
        };
      case ButtonVariant.success:
        return {
          'bg': MedConnectColors.success,
          'fg': MedConnectColors.primaryForeground,
        };
    }
  }

  Map<String, dynamic> _getSize() {
    switch (widget.size) {
      case ButtonSize.sm:
        return {
          'padding': const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          'fontSize': 12.0,
          'iconSize': 14.0,
        };
      case ButtonSize.md:
        return {
          'padding': const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          'fontSize': 14.0,
          'iconSize': 16.0,
        };
      case ButtonSize.lg:
        return {
          'padding': const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          'fontSize': 16.0,
          'iconSize': 20.0,
        };
      case ButtonSize.icon:
        return {
          'padding': const EdgeInsets.all(10),
          'fontSize': 0.0,
          'iconSize': 20.0,
        };
    }
  }
}

/// ============================================================================
/// CARD - shadcn-inspired card with hover effects
/// Use MedCard instead of Card to avoid conflict with Flutter's Card widget
/// ============================================================================

class MedCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final Color? backgroundColor;
  final bool hoverable;

  const MedCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.backgroundColor,
    this.hoverable = true,
  });

  @override
  State<MedCard> createState() => _MedCardState();
}

class _MedCardState extends State<MedCard> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: MedConnectDurations.fast,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: widget.onTap != null && widget.hoverable
          ? (_) => _controller.forward()
          : null,
      onTapUp: widget.onTap != null && widget.hoverable
          ? (_) => _controller.reverse()
          : null,
      onTapCancel: widget.hoverable ? () => _controller.reverse() : null,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.scale(
            scale: 1 - (_controller.value * 0.01),
            child: child,
          );
        },
        child: AnimatedContainer(
          duration: MedConnectDurations.fast,
          decoration: BoxDecoration(
            color: widget.backgroundColor ?? MedConnectColors.card,
            borderRadius: BorderRadius.circular(MedConnectRadius.lg),
            border: Border.all(color: MedConnectColors.border),
            boxShadow: MedConnectShadows.sm,
          ),
          padding: widget.padding ?? const EdgeInsets.all(MedConnectSpacing.lg),
          child: widget.child,
        ),
      ),
    );
  }
}

/// ============================================================================
/// BADGE - shadcn-inspired badge/chip
/// ============================================================================

enum BadgeVariant { primary, secondary, success, warning, destructive, outline }

class Badge extends StatelessWidget {
  final String text;
  final BadgeVariant variant;
  final IconData? icon;
  final VoidCallback? onTap;

  const Badge({
    super.key,
    required this.text,
    this.variant = BadgeVariant.secondary,
    this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = _getColors();
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: colors['bg'],
          borderRadius: BorderRadius.circular(MedConnectRadius.full),
          border: colors['border'] != null
              ? Border.all(color: colors['border']!)
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 12, color: colors['fg']),
              const Gap(4),
            ],
            Text(
              text,
              style: MedConnectTextStyles.labelMedium.copyWith(color: colors['fg']),
            ),
          ],
        ),
      ),
    );
  }

  Map<String, Color?> _getColors() {
    switch (variant) {
      case BadgeVariant.primary:
        return {
          'bg': MedConnectColors.primaryLight,
          'fg': MedConnectColors.primary,
        };
      case BadgeVariant.secondary:
        return {
          'bg': MedConnectColors.secondary,
          'fg': MedConnectColors.textSecondary,
        };
      case BadgeVariant.success:
        return {
          'bg': MedConnectColors.successLight,
          'fg': MedConnectColors.success,
        };
      case BadgeVariant.warning:
        return {
          'bg': MedConnectColors.warningLight,
          'fg': MedConnectColors.warning,
        };
      case BadgeVariant.destructive:
        return {
          'bg': MedConnectColors.error.withAlpha(26),
          'fg': MedConnectColors.error,
        };
      case BadgeVariant.outline:
        return {
          'bg': Colors.transparent,
          'fg': MedConnectColors.textSecondary,
          'border': MedConnectColors.border,
        };
    }
  }
}

/// ============================================================================
/// AVATAR - shadcn-inspired avatar with fallback
/// ============================================================================

class Avatar extends StatelessWidget {
  final String? imageUrl;
  final String name;
  final double size;
  final VoidCallback? onTap;

  const Avatar({
    super.key,
    this.imageUrl,
    required this.name,
    this.size = 40,
    this.onTap,
  });

  String get _initials {
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  Color get _backgroundColor {
    final hash = name.hashCode;
    final colors = [
      MedConnectColors.primary,
      MedConnectColors.success,
      MedConnectColors.warning,
      const Color(0xFF8B5CF6),
      const Color(0xFFEC4899),
      const Color(0xFF06B6D4),
    ];
    return colors[hash.abs() % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: _backgroundColor,
          borderRadius: BorderRadius.circular(MedConnectRadius.full),
        ),
        child: imageUrl != null && imageUrl!.isNotEmpty
            ? ClipOval(
                child: Image.network(
                  imageUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _buildFallback(),
                ),
              )
            : _buildFallback(),
      ),
    );
  }

  Widget _buildFallback() {
    return Center(
      child: Text(
        _initials,
        style: TextStyle(
          color: Colors.white,
          fontSize: size * 0.4,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// ============================================================================
/// INPUT - shadcn-inspired text input
/// ============================================================================

class Input extends StatefulWidget {
  final String? hintText;
  final TextEditingController? controller;
  final bool obscureText;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final VoidCallback? onSuffixTap;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final TextInputType? keyboardType;
  final bool enabled;
  final String? errorText;

  const Input({
    super.key,
    this.hintText,
    this.controller,
    this.obscureText = false,
    this.prefixIcon,
    this.suffixIcon,
    this.onSuffixTap,
    this.onChanged,
    this.onSubmitted,
    this.keyboardType,
    this.enabled = true,
    this.errorText,
  });

  @override
  State<Input> createState() => _InputState();
}

class _InputState extends State<Input> {
  late FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _focusNode.addListener(() {
      setState(() => _isFocused = _focusNode.hasFocus);
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: MedConnectDurations.fast,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(MedConnectRadius.md),
        boxShadow: _isFocused ? MedConnectShadows.glowPrimary : null,
      ),
      child: TextField(
        controller: widget.controller,
        focusNode: _focusNode,
        obscureText: widget.obscureText,
        onChanged: widget.onChanged,
        onSubmitted: widget.onSubmitted,
        keyboardType: widget.keyboardType,
        enabled: widget.enabled,
        style: MedConnectTextStyles.bodyMedium,
        decoration: InputDecoration(
          hintText: widget.hintText,
          prefixIcon: widget.prefixIcon != null
              ? Icon(widget.prefixIcon, size: 18, color: MedConnectColors.textTertiary)
              : null,
          suffixIcon: widget.suffixIcon != null
              ? GestureDetector(
                  onTap: widget.onSuffixTap,
                  child: Icon(
                    widget.suffixIcon,
                    size: 18,
                    color: MedConnectColors.textTertiary,
                  ),
                )
              : null,
          errorText: widget.errorText,
        ),
      ),
    );
  }
}

/// ============================================================================
/// SKELETON - Loading placeholder
/// ============================================================================

class Skeleton extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const Skeleton({
    super.key,
    required this.width,
    required this.height,
    this.radius = MedConnectRadius.md,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: MedConnectColors.skeleton,
        borderRadius: BorderRadius.circular(radius),
      ),
    )
        .animate(onPlay: (controller) => controller.repeat())
        .shimmer(
          duration: 1500.ms,
          color: MedConnectColors.skeletonHighlight,
        );
  }
}

/// ============================================================================
/// EMPTY STATE - No data placeholder
/// ============================================================================

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? description;
  final Widget? action;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.description,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(MedConnectSpacing.xxxl),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: MedConnectColors.secondary,
              borderRadius: BorderRadius.circular(MedConnectRadius.full),
            ),
      child: Icon(
        icon,
        size: 40,
        color: MedConnectColors.textSecondary,
      ),
          ),
          const Gap(MedConnectSpacing.lg),
          Text(title, style: MedConnectTextStyles.titleLarge),
          if (description != null) ...[
            const Gap(MedConnectSpacing.sm),
            Text(
              description!,
              style: MedConnectTextStyles.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
          if (action != null) ...[
            const Gap(MedConnectSpacing.xl),
            action!,
          ],
        ],
      ),
    );
  }
}

/// ============================================================================
/// SECTION - Content section with title
/// ============================================================================

class Section extends StatelessWidget {
  final String title;
  final String? actionText;
  final VoidCallback? onActionTap;
  final Widget child;

  const Section({
    super.key,
    required this.title,
    this.actionText,
    this.onActionTap,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: MedConnectTextStyles.titleLarge),
            if (actionText != null)
              TextButton(
                onPressed: onActionTap,
                child: Text(actionText!),
              ),
          ],
        ),
        const Gap(MedConnectSpacing.md),
        child,
      ],
    );
  }
}

/// ============================================================================
/// DIVIDER - Use MedDivider to avoid conflict with Flutter's Divider widget
/// ============================================================================

class MedDivider extends StatelessWidget {
  final String? text;

  const MedDivider({super.key, this.text});

  @override
  Widget build(BuildContext context) {
    if (text == null) {
      return const Divider();
    }
    return Row(
      children: [
        const Expanded(child: Divider()),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: MedConnectSpacing.md),
          child: Text(
            text!,
            style: MedConnectTextStyles.bodySmall,
          ),
        ),
        const Expanded(child: Divider()),
      ],
    );
  }
}
