import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/medconnect_theme.dart';

/// MedConnect Design System 2.0
/// Componentes consistentes para toda a aplicação

// ==================== BUTTONS ====================

enum MedButtonVariant { primary, secondary, outline, ghost, danger }
enum MedButtonSize { small, medium, large }

class MedButton extends StatefulWidget {
  final String? text;
  final Widget? child;
  final VoidCallback? onPressed;
  final MedButtonVariant variant;
  final MedButtonSize size;
  final bool isLoading;
  final bool isDisabled;
  final IconData? icon;
  final IconData? trailingIcon;
  final bool fullWidth;
  final double? width;

  const MedButton({
    super.key,
    this.text,
    this.child,
    this.onPressed,
    this.variant = MedButtonVariant.primary,
    this.size = MedButtonSize.medium,
    this.isLoading = false,
    this.isDisabled = false,
    this.icon,
    this.trailingIcon,
    this.fullWidth = false,
    this.width,
  }) : assert(text != null || child != null, 'Either text or child must be provided');

  @override
  State<MedButton> createState() => _MedButtonState();
}

class _MedButtonState extends State<MedButton> with SingleTickerProviderStateMixin {
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
    final isDisabled = widget.isDisabled || widget.isLoading || widget.onPressed == null;

    Widget buttonContent = _buildContent();

    if (widget.isLoading) {
      buttonContent = _buildLoadingContent();
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.scale(
          scale: 1 - (_controller.value * 0.02),
          child: child,
        );
      },
      child: GestureDetector(
        onTapDown: isDisabled ? null : (_) => _controller.forward(),
        onTapUp: isDisabled ? null : (_) => _controller.reverse(),
        onTapCancel: isDisabled ? null : () => _controller.reverse(),
        child: SizedBox(
          width: widget.fullWidth ? double.infinity : widget.width,
          child: ElevatedButton(
            onPressed: isDisabled ? null : widget.onPressed,
            style: _getButtonStyle(),
            child: buttonContent,
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    final List<Widget> children = [];

    if (widget.icon != null) {
      children.add(Icon(widget.icon, size: _getIconSize()));
      if (widget.text != null || widget.child != null) {
        children.add(const SizedBox(width: MedConnectSpacing.sm));
      }
    }

    if (widget.child != null) {
      children.add(widget.child!);
    } else if (widget.text != null) {
      children.add(Text(widget.text!));
    }

    if (widget.trailingIcon != null) {
      if (children.isNotEmpty) {
        children.add(const SizedBox(width: MedConnectSpacing.sm));
      }
      children.add(Icon(widget.trailingIcon, size: _getIconSize()));
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: children,
    );
  }

  Widget _buildLoadingContent() {
    return SizedBox(
      height: _getFontSize() * 1.2,
      width: _getFontSize() * 1.2,
      child: CircularProgressIndicator(
        strokeWidth: 2,
        valueColor: AlwaysStoppedAnimation(_getLoadingColor()),
      ),
    );
  }

  double _getIconSize() {
    switch (widget.size) {
      case MedButtonSize.small:
        return 16;
      case MedButtonSize.large:
        return 20;
      default:
        return 18;
    }
  }

  double _getFontSize() {
    switch (widget.size) {
      case MedButtonSize.small:
        return 12;
      case MedButtonSize.large:
        return 16;
      default:
        return 14;
    }
  }

  Color _getLoadingColor() {
    switch (widget.variant) {
      case MedButtonVariant.primary:
      case MedButtonVariant.danger:
        return Colors.white;
      default:
        return MedConnectColors.primary;
    }
  }

  ButtonStyle _getButtonStyle() {
    final foregroundColor = _getForegroundColor();
    final backgroundColor = _getBackgroundColor();
    final padding = _getPadding();
    final textStyle = _getTextStyle();

    return ElevatedButton.styleFrom(
      foregroundColor: foregroundColor,
      backgroundColor: backgroundColor,
      elevation: widget.variant == MedButtonVariant.primary ? 2 : 0,
      shadowColor: widget.variant == MedButtonVariant.primary
          ? MedConnectColors.primary.withAlpha(51)
          : Colors.transparent,
      padding: padding,
      textStyle: textStyle,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(MedConnectRadius.md),
        side: _getBorderSide(),
      ),
      minimumSize: const Size(44, 44),
    );
  }

  Color _getForegroundColor() {
    if (widget.isDisabled) return MedConnectColors.textTertiary;

    switch (widget.variant) {
      case MedButtonVariant.primary:
      case MedButtonVariant.danger:
        return Colors.white;
      case MedButtonVariant.secondary:
        return MedConnectColors.textPrimary;
      case MedButtonVariant.outline:
      case MedButtonVariant.ghost:
        return MedConnectColors.primary;
    }
  }

  Color _getBackgroundColor() {
    if (widget.isDisabled) return MedConnectColors.neutral200;

    switch (widget.variant) {
      case MedButtonVariant.primary:
        return MedConnectColors.primary;
      case MedButtonVariant.secondary:
        return MedConnectColors.surfaceVariant;
      case MedButtonVariant.outline:
      case MedButtonVariant.ghost:
        return Colors.transparent;
      case MedButtonVariant.danger:
        return MedConnectColors.error;
    }
  }

  BorderSide _getBorderSide() {
    if (widget.variant == MedButtonVariant.outline) {
      return BorderSide(
        color: widget.isDisabled
            ? MedConnectColors.neutral300
            : MedConnectColors.primary,
        width: 1.5,
      );
    }
    return BorderSide.none;
  }

  EdgeInsets _getPadding() {
    switch (widget.size) {
      case MedButtonSize.small:
        return const EdgeInsets.symmetric(
          horizontal: MedConnectSpacing.md,
          vertical: MedConnectSpacing.sm,
        );
      case MedButtonSize.large:
        return const EdgeInsets.symmetric(
          horizontal: MedConnectSpacing.xxl,
          vertical: MedConnectSpacing.lg,
        );
      default:
        return const EdgeInsets.symmetric(
          horizontal: MedConnectSpacing.xl,
          vertical: MedConnectSpacing.md,
        );
    }
  }

  TextStyle _getTextStyle() {
    final baseStyle = switch (widget.size) {
      MedButtonSize.small => MedConnectTextStyles.buttonSmall,
      MedButtonSize.large => MedConnectTextStyles.buttonLarge,
      _ => MedConnectTextStyles.buttonMedium,
    };

    return baseStyle.copyWith(
      color: _getForegroundColor(),
    );
  }
}

// ==================== CARDS ====================

enum MedCardVariant { defaultValue, outlined, elevated, filled }

class MedCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final MedCardVariant variant;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final BorderRadius? borderRadius;

  const MedCard({
    super.key,
    required this.child,
    this.onTap,
    this.variant = MedCardVariant.defaultValue,
    this.padding,
    this.margin,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(MedConnectRadius.lg);

    Widget card = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: _getBackgroundColor(),
        borderRadius: radius,
        border: _getBorder(),
        boxShadow: _getShadows(),
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Padding(
          padding: padding ?? const EdgeInsets.all(MedConnectSpacing.lg),
          child: child,
        ),
      ),
    );

    if (onTap != null) {
      card = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: card,
        ),
      );
    }

    return card;
  }

  Color _getBackgroundColor() {
    switch (variant) {
      case MedCardVariant.filled:
        return MedConnectColors.surfaceVariant;
      case MedCardVariant.defaultValue:
      case MedCardVariant.outlined:
      case MedCardVariant.elevated:
        return MedConnectColors.card;
    }
  }

  Border? _getBorder() {
    switch (variant) {
      case MedCardVariant.outlined:
        return Border.all(color: MedConnectColors.border, width: 1.5);
      case MedCardVariant.defaultValue:
      case MedCardVariant.elevated:
        return Border.all(color: MedConnectColors.border, width: 1);
      case MedCardVariant.filled:
        return null;
    }
  }

  List<BoxShadow> _getShadows() {
    switch (variant) {
      case MedCardVariant.elevated:
        return MedConnectShadows.md;
      case MedCardVariant.defaultValue:
        return MedConnectShadows.xs;
      case MedCardVariant.outlined:
      case MedCardVariant.filled:
        return [];
    }
  }
}

// ==================== INPUTS ====================

class MedInput extends StatefulWidget {
  final String? label;
  final String? hint;
  final String? helper;
  final String? error;
  final TextEditingController? controller;
  final bool obscureText;
  final bool enabled;
  final bool autofocus;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final Widget? prefix;
  final Widget? suffix;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final VoidCallback? onSuffixTap;
  final int? maxLines;
  final int? maxLength;
  final String? Function(String?)? validator;

  const MedInput({
    super.key,
    this.label,
    this.hint,
    this.helper,
    this.error,
    this.controller,
    this.obscureText = false,
    this.enabled = true,
    this.autofocus = false,
    this.keyboardType,
    this.textInputAction,
    this.onChanged,
    this.onSubmitted,
    this.prefix,
    this.suffix,
    this.prefixIcon,
    this.suffixIcon,
    this.onSuffixTap,
    this.maxLines = 1,
    this.maxLength,
    this.validator,
  });

  @override
  State<MedInput> createState() => _MedInputState();
}

class _MedInputState extends State<MedInput> {
  late bool _obscureText;
  late FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _obscureText = widget.obscureText;
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Text(
            widget.label!,
            style: MedConnectTextStyles.labelMedium.copyWith(
              color: MedConnectColors.textSecondary,
            ),
          ),
          const SizedBox(height: MedConnectSpacing.xs),
        ],
        TextFormField(
          controller: widget.controller,
          focusNode: _focusNode,
          obscureText: _obscureText,
          enabled: widget.enabled,
          autofocus: widget.autofocus,
          keyboardType: widget.keyboardType,
          textInputAction: widget.textInputAction,
          onChanged: widget.onChanged,
          onFieldSubmitted: widget.onSubmitted,
          maxLines: widget.maxLines,
          maxLength: widget.maxLength,
          validator: widget.validator,
          style: MedConnectTextStyles.bodyMedium,
          decoration: InputDecoration(
            hintText: widget.hint,
            hintStyle: MedConnectTextStyles.bodyMedium.copyWith(
              color: MedConnectColors.textTertiary,
            ),
            errorText: widget.error,
            prefixIcon: widget.prefixIcon != null
                ? Icon(
              widget.prefixIcon,
              size: 20,
              color: _isFocused
                  ? MedConnectColors.primary
                  : MedConnectColors.textTertiary,
            )
                : widget.prefix,
            suffixIcon: _buildSuffixIcon(),
          ),
        ),
        if (widget.helper != null && widget.error == null) ...[
          const SizedBox(height: MedConnectSpacing.xs),
          Text(
            widget.helper!,
            style: MedConnectTextStyles.caption.copyWith(
              color: MedConnectColors.textTertiary,
            ),
          ),
        ],
      ],
    );
  }

  Widget? _buildSuffixIcon() {
    if (widget.obscureText) {
      return IconButton(
        icon: Icon(
          _obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined,
          size: 20,
          color: MedConnectColors.textTertiary,
        ),
        onPressed: () => setState(() => _obscureText = !_obscureText),
      );
    }

    if (widget.suffixIcon != null) {
      return IconButton(
        icon: Icon(
          widget.suffixIcon,
          size: 20,
          color: MedConnectColors.textTertiary,
        ),
        onPressed: widget.onSuffixTap,
      );
    }

    return widget.suffix;
  }
}

// ==================== CHIPS ====================

enum MedChipVariant { default_, primary, secondary, success, warning, error }

class MedChip extends StatelessWidget {
  final String label;
  final MedChipVariant variant;
  final bool isSelected;
  final VoidCallback? onTap;
  final VoidCallback? onDeleted;
  final IconData? icon;

  const MedChip({
    super.key,
    required this.label,
    this.variant = MedChipVariant.default_,
    this.isSelected = false,
    this.onTap,
    this.onDeleted,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final backgroundColor = _getBackgroundColor();
    final foregroundColor = _getForegroundColor();

    return Material(
      color: backgroundColor,
      borderRadius: BorderRadius.circular(MedConnectRadius.full),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(MedConnectRadius.full),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: MedConnectSpacing.md,
            vertical: MedConnectSpacing.xs,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(MedConnectRadius.full),
            border: Border.all(
              color: isSelected ? foregroundColor : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14, color: foregroundColor),
                const SizedBox(width: MedConnectSpacing.xs),
              ],
              Text(
                label,
                style: MedConnectTextStyles.labelMedium.copyWith(
                  color: foregroundColor,
                ),
              ),
              if (onDeleted != null) ...[
                const SizedBox(width: MedConnectSpacing.xs),
                GestureDetector(
                  onTap: onDeleted,
                  child: Icon(
                    Icons.close,
                    size: 14,
                    color: foregroundColor,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _getBackgroundColor() {
    if (isSelected) {
      switch (variant) {
        case MedChipVariant.primary:
          return MedConnectColors.primary;
        case MedChipVariant.secondary:
          return MedConnectColors.secondary;
        case MedChipVariant.success:
          return MedConnectColors.success;
        case MedChipVariant.warning:
          return MedConnectColors.warning;
        case MedChipVariant.error:
          return MedConnectColors.error;
        case MedChipVariant.default_:
          return MedConnectColors.primary;
      }
    }

    switch (variant) {
      case MedChipVariant.primary:
        return MedConnectColors.primaryLight;
      case MedChipVariant.secondary:
        return MedConnectColors.secondaryLight;
      case MedChipVariant.success:
        return MedConnectColors.successLight;
      case MedChipVariant.warning:
        return MedConnectColors.warningLight;
      case MedChipVariant.error:
        return MedConnectColors.errorLight;
      case MedChipVariant.default_:
        return MedConnectColors.surfaceVariant;
    }
  }

  Color _getForegroundColor() {
    if (isSelected) {
      return Colors.white;
    }

    switch (variant) {
      case MedChipVariant.primary:
        return MedConnectColors.primary;
      case MedChipVariant.secondary:
        return MedConnectColors.secondary;
      case MedChipVariant.success:
        return MedConnectColors.success;
      case MedChipVariant.warning:
        return MedConnectColors.warning;
      case MedChipVariant.error:
        return MedConnectColors.error;
      case MedChipVariant.default_:
        return MedConnectColors.textSecondary;
    }
  }
}

// ==================== BADGES ====================

enum MedBadgeVariant { default_, primary, success, warning, error, info }

class MedBadge extends StatelessWidget {
  final String label;
  final MedBadgeVariant variant;
  final IconData? icon;

  const MedBadge({
    super.key,
    required this.label,
    this.variant = MedBadgeVariant.default_,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final backgroundColor = _getBackgroundColor();
    final foregroundColor = _getForegroundColor();

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: MedConnectSpacing.sm,
        vertical: MedConnectSpacing.xxs,
      ),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(MedConnectRadius.sm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: foregroundColor),
            const SizedBox(width: MedConnectSpacing.xs),
          ],
          Text(
            label,
            style: MedConnectTextStyles.labelSmall.copyWith(
              color: foregroundColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Color _getBackgroundColor() {
    switch (variant) {
      case MedBadgeVariant.primary:
        return MedConnectColors.primaryLight;
      case MedBadgeVariant.success:
        return MedConnectColors.successLight;
      case MedBadgeVariant.warning:
        return MedConnectColors.warningLight;
      case MedBadgeVariant.error:
        return MedConnectColors.errorLight;
      case MedBadgeVariant.info:
        return MedConnectColors.infoLight;
      case MedBadgeVariant.default_:
        return MedConnectColors.surfaceVariant;
    }
  }

  Color _getForegroundColor() {
    switch (variant) {
      case MedBadgeVariant.primary:
        return MedConnectColors.primary;
      case MedBadgeVariant.success:
        return MedConnectColors.success;
      case MedBadgeVariant.warning:
        return MedConnectColors.warning;
      case MedBadgeVariant.error:
        return MedConnectColors.error;
      case MedBadgeVariant.info:
        return MedConnectColors.info;
      case MedBadgeVariant.default_:
        return MedConnectColors.textSecondary;
    }
  }
}

// ==================== SKELETON/LOADING ====================

class MedSkeleton extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const MedSkeleton({
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

// ==================== EMPTY STATE ====================

class MedEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? description;
  final String? actionLabel;
  final VoidCallback? onAction;

  const MedEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.description,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(MedConnectSpacing.xxxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: MedConnectColors.primaryLight,
                borderRadius: BorderRadius.circular(MedConnectRadius.xxl),
              ),
              child: Icon(
                icon,
                size: 40,
                color: MedConnectColors.primary,
              ),
            ),
            const SizedBox(height: MedConnectSpacing.xl),
            Text(
              title,
              style: MedConnectTextStyles.headingSmall,
              textAlign: TextAlign.center,
            ),
            if (description != null) ...[
              const SizedBox(height: MedConnectSpacing.sm),
              Text(
                description!,
                style: MedConnectTextStyles.bodyMedium.copyWith(
                  color: MedConnectColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: MedConnectSpacing.xl),
              MedButton(
                text: actionLabel!,
                onPressed: onAction,
                variant: MedButtonVariant.primary,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ==================== DIVIDER ====================

class MedDivider extends StatelessWidget {
  final String? label;

  const MedDivider({super.key, this.label});

  @override
  Widget build(BuildContext context) {
    if (label == null) {
      return const Divider(
        color: MedConnectColors.divider,
        thickness: 1,
        height: MedConnectSpacing.lg * 2,
      );
    }

    return Row(
      children: [
        const Expanded(child: Divider(color: MedConnectColors.divider)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: MedConnectSpacing.md),
          child: Text(
            label!,
            style: MedConnectTextStyles.labelMedium.copyWith(
              color: MedConnectColors.textTertiary,
            ),
          ),
        ),
        const Expanded(child: Divider(color: MedConnectColors.divider)),
      ],
    );
  }
}

// ==================== AVATAR ====================

class MedAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? name;
  final double size;
  final VoidCallback? onTap;
  final bool showStatus;
  final bool isOnline;

  const MedAvatar({
    super.key,
    this.imageUrl,
    this.name,
    this.size = 40,
    this.onTap,
    this.showStatus = false,
    this.isOnline = false,
  });

  String get _initials {
    if (name == null || name!.isEmpty) return '?';
    final parts = name!.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name!.substring(0, 1).toUpperCase();
  }

  Color get _backgroundColor {
    if (name == null) return MedConnectColors.neutral400;
    final colors = [
      MedConnectColors.primary,
      MedConnectColors.secondary,
      MedConnectColors.accent,
      MedConnectColors.success,
      MedConnectColors.warning,
      MedConnectColors.info,
    ];
    return colors[name!.hashCode.abs() % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    Widget avatar = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(MedConnectRadius.full),
        border: Border.all(
          color: MedConnectColors.surface,
          width: 2,
        ),
      ),
      child: ClipOval(
        child: imageUrl != null && imageUrl!.isNotEmpty
            ? Image.network(
          imageUrl!,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallback(),
          loadingBuilder: (_, child, progress) {
            if (progress == null) return child;
            return _buildFallback();
          },
        )
            : _buildFallback(),
      ),
    );

    if (showStatus) {
      avatar = Stack(
        clipBehavior: Clip.none,
        children: [
          avatar,
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: size * 0.25,
              height: size * 0.25,
              decoration: BoxDecoration(
                color: isOnline
                    ? MedConnectColors.success
                    : MedConnectColors.neutral400,
                borderRadius: BorderRadius.circular(MedConnectRadius.full),
                border: Border.all(
                  color: MedConnectColors.surface,
                  width: 2,
                ),
              ),
            ),
          ),
        ],
      );
    }

    if (onTap != null) {
      avatar = GestureDetector(
        onTap: onTap,
        child: avatar,
      );
    }

    return avatar;
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

// ==================== SECTION ====================

class MedSection extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const MedSection({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
    required this.child,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: MedConnectTextStyles.titleLarge,
              ),
              if (actionLabel != null)
                TextButton(
                  onPressed: onAction,
                  child: Text(actionLabel!),
                ),
            ],
          ),
          const SizedBox(height: MedConnectSpacing.md),
          child,
        ],
      ),
    );
  }
}
