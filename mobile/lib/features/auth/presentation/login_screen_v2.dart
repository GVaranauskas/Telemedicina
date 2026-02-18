import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/medconnect_theme.dart';
import '../../../core/widgets/design_system.dart';
import '../../../core/providers/auth_provider.dart';

class LoginScreenV2 extends ConsumerStatefulWidget {
  const LoginScreenV2({super.key});

  @override
  ConsumerState<LoginScreenV2> createState() => _LoginScreenV2State();
}

class _LoginScreenV2State extends ConsumerState<LoginScreenV2> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authProvider.notifier).login(
            _emailController.text.trim(),
            _passwordController.text,
          );

      if (mounted) {
        context.go('/feed');
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Email ou senha incorretos';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MedConnectColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: MedConnectSpacing.xl),
            child: Column(
              children: [
                const SizedBox(height: MedConnectSpacing.xxxxxl),

                // Logo and Brand
                _buildBrand(),

                const SizedBox(height: MedConnectSpacing.xxxl),

                // Welcome Text
                _buildWelcomeText(),

                const SizedBox(height: MedConnectSpacing.xxl),

                // Error Message
                if (_errorMessage != null)
                  _buildErrorMessage()
                      .animate()
                      .shake(duration: 400.ms),

                if (_errorMessage != null)
                  const SizedBox(height: MedConnectSpacing.lg),

                // Login Form
                _buildForm(),

                const SizedBox(height: MedConnectSpacing.xl),

                // Forgot Password
                _buildForgotPassword(),

                const SizedBox(height: MedConnectSpacing.xxl),

                // Login Button
                _buildLoginButton(),

                const SizedBox(height: MedConnectSpacing.xxl),

                // Divider
                const MedDivider(label: 'ou'),

                const SizedBox(height: MedConnectSpacing.xl),

                // Social Login (placeholder for future)
                _buildSocialLogin(),

                const SizedBox(height: MedConnectSpacing.xxl),

                // Register Link
                _buildRegisterLink(),

                const SizedBox(height: MedConnectSpacing.xl),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBrand() {
    return Column(
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                MedConnectColors.primary,
                MedConnectColors.secondary,
              ],
            ),
            borderRadius: BorderRadius.circular(MedConnectRadius.xl),
            boxShadow: MedConnectShadows.glowPrimary,
          ),
          child: const Icon(
            Icons.favorite_rounded,
            size: 48,
            color: Colors.white,
          ),
        )
            .animate()
            .scale(delay: 100.ms, duration: 600.ms, curve: Curves.elasticOut)
            .fadeIn(delay: 100.ms),

        const SizedBox(height: MedConnectSpacing.lg),

        Text(
          'MedConnect',
          style: MedConnectTextStyles.displaySmall.copyWith(
            color: MedConnectColors.primary,
            fontWeight: FontWeight.w800,
          ),
        )
            .animate()
            .fadeIn(delay: 300.ms)
            .slideY(begin: 0.3, delay: 300.ms, duration: 500.ms),

        const SizedBox(height: MedConnectSpacing.xs),

        Text(
          'Conectando médicos, salvando vidas',
          style: MedConnectTextStyles.bodyMedium.copyWith(
            color: MedConnectColors.textSecondary,
          ),
        )
            .animate()
            .fadeIn(delay: 500.ms),
      ],
    );
  }

  Widget _buildWelcomeText() {
    return Column(
      children: [
        Text(
          'Bem-vindo de volta!',
          style: MedConnectTextStyles.headingLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: MedConnectSpacing.sm),
        Text(
          'Faça login para acessar sua rede médica',
          style: MedConnectTextStyles.bodyLarge.copyWith(
            color: MedConnectColors.textSecondary,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    )
        .animate()
        .fadeIn(delay: 400.ms)
        .slideY(begin: 0.2, delay: 400.ms);
  }

  Widget _buildErrorMessage() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(MedConnectSpacing.md),
      decoration: BoxDecoration(
        color: MedConnectColors.errorLight,
        borderRadius: BorderRadius.circular(MedConnectRadius.md),
        border: Border.all(color: MedConnectColors.error.withAlpha(100)),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: MedConnectColors.error, size: 20),
          const SizedBox(width: MedConnectSpacing.sm),
          Expanded(
            child: Text(
              _errorMessage!,
              style: MedConnectTextStyles.bodyMedium.copyWith(
                color: MedConnectColors.error,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          MedInput(
            label: 'Email',
            hint: 'seu@email.com',
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            prefixIcon: Icons.email_outlined,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Por favor, insira seu email';
              }
              if (!value.contains('@')) {
                return 'Email inválido';
              }
              return null;
            },
          ),
          const SizedBox(height: MedConnectSpacing.lg),
          MedInput(
            label: 'Senha',
            hint: 'Sua senha',
            controller: _passwordController,
            obscureText: true,
            textInputAction: TextInputAction.done,
            prefixIcon: Icons.lock_outline,
            onSubmitted: (_) => _login(),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Por favor, insira sua senha';
              }
              if (value.length < 6) {
                return 'Senha deve ter pelo menos 6 caracteres';
              }
              return null;
            },
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(delay: 500.ms)
        .slideY(begin: 0.2, delay: 500.ms);
  }

  Widget _buildForgotPassword() {
    return Align(
      alignment: Alignment.centerRight,
      child: TextButton(
        onPressed: () {
          // TODO: Implement forgot password
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Funcionalidade em desenvolvimento'),
            ),
          );
        },
        child: Text(
          'Esqueceu a senha?',
          style: MedConnectTextStyles.labelLarge.copyWith(
            color: MedConnectColors.primary,
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(delay: 600.ms);
  }

  Widget _buildLoginButton() {
    return MedButton(
      text: 'Entrar',
      onPressed: _login,
      isLoading: _isLoading,
      variant: MedButtonVariant.primary,
      size: MedButtonSize.large,
      fullWidth: true,
    )
        .animate()
        .fadeIn(delay: 700.ms)
        .slideY(begin: 0.2, delay: 700.ms);
  }

  Widget _buildSocialLogin() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildSocialButton(Icons.g_mobiledata, 'Google', () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Login com Google em breve')),
          );
        }),
        const SizedBox(width: MedConnectSpacing.lg),
        _buildSocialButton(Icons.apple, 'Apple', () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Login com Apple em breve')),
          );
        }),
      ],
    )
        .animate()
        .fadeIn(delay: 800.ms);
  }

  Widget _buildSocialButton(IconData icon, String label, VoidCallback onTap) {
    return MedButton(
      icon: icon,
      text: label,
      onPressed: onTap,
      variant: MedButtonVariant.outline,
      size: MedButtonSize.medium,
    );
  }

  Widget _buildRegisterLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Não tem uma conta? ',
          style: MedConnectTextStyles.bodyMedium.copyWith(
            color: MedConnectColors.textSecondary,
          ),
        ),
        TextButton(
          onPressed: () => context.push('/register'),
          child: Text(
            'Cadastre-se',
            style: MedConnectTextStyles.labelLarge.copyWith(
              color: MedConnectColors.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    )
        .animate()
        .fadeIn(delay: 900.ms);
  }
}
