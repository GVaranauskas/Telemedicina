import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/auth_provider.dart';

class RegisterPatientScreen extends ConsumerStatefulWidget {
  const RegisterPatientScreen({super.key});

  @override
  ConsumerState<RegisterPatientScreen> createState() =>
      _RegisterPatientScreenState();
}

class _RegisterPatientScreenState
    extends ConsumerState<RegisterPatientScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _cpfController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _cpfController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authProvider.notifier).registerPatient(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          fullName: _nameController.text.trim(),
          phone: _phoneController.text.trim().isNotEmpty
              ? _phoneController.text.trim()
              : null,
          cpf: _cpfController.text.trim().isNotEmpty
              ? _cpfController.text.trim()
              : null,
        );

    if (mounted && success) {
      context.go('/patient/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    ref.listen<AuthState>(authProvider, (prev, next) {
      if (next.error != null && prev?.error != next.error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.error!,
                style: const TextStyle(color: Colors.white)),
            backgroundColor: const Color(0xFFEF4444).withOpacity(0.9),
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        );
      }
    });

    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: const Color(0xFF0A0E21),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Stack(
        children: [
          // Background gradient
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFF0A0E21),
                  Color(0xFF1A1A3E),
                  Color(0xFF0D1B2A),
                ],
              ),
            ),
          ),

          // Decorative circles
          Positioned(
            top: -60,
            right: -40,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF667EEA).withOpacity(0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 100,
            left: -60,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF764BA2).withOpacity(0.06),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Content
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 20),

                    // Header
                    _buildHeader()
                        .animate()
                        .fadeIn(duration: 500.ms)
                        .slideY(begin: -0.1),

                    const SizedBox(height: 40),

                    // Form fields
                    ..._buildFormFields(authState.isLoading),

                    const SizedBox(height: 32),

                    // Register button
                    _buildRegisterButton(authState.isLoading)
                        .animate()
                        .fadeIn(delay: 400.ms, duration: 400.ms),

                    const SizedBox(height: 20),

                    // Login link
                    Center(
                      child: TextButton(
                        onPressed: () => context.pop(),
                        child: Text.rich(
                          TextSpan(
                            text: 'Ja tenho conta ',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.4),
                              fontSize: 14,
                            ),
                            children: [
                              TextSpan(
                                text: 'Entrar',
                                style: TextStyle(
                                  color: const Color(0xFF00C9FF),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        // Animated icon
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF667EEA).withOpacity(0.3),
                blurRadius: 20,
                spreadRadius: 0,
              ),
            ],
          ),
          child: const Icon(
            Icons.favorite_rounded,
            size: 30,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Criar conta',
          style: TextStyle(
            color: Colors.white,
            fontSize: 26,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Encontre medicos proximos\ncom horarios disponiveis',
          style: TextStyle(
            color: Colors.white.withOpacity(0.4),
            fontSize: 15,
            height: 1.4,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  List<Widget> _buildFormFields(bool isLoading) {
    return [
      _buildGlassField(
        controller: _nameController,
        label: 'Nome completo',
        icon: Icons.person_outline_rounded,
        enabled: !isLoading,
        validator: (v) => v?.isEmpty == true ? 'Informe o nome' : null,
        delay: 0,
      ),
      const SizedBox(height: 14),
      _buildGlassField(
        controller: _emailController,
        label: 'Email',
        icon: Icons.email_outlined,
        keyboardType: TextInputType.emailAddress,
        enabled: !isLoading,
        validator: (v) {
          if (v?.isEmpty == true) return 'Informe o email';
          if (!v!.contains('@')) return 'Email invalido';
          return null;
        },
        delay: 50,
      ),
      const SizedBox(height: 14),
      _buildGlassField(
        controller: _phoneController,
        label: 'Telefone (opcional)',
        icon: Icons.phone_outlined,
        keyboardType: TextInputType.phone,
        enabled: !isLoading,
        hintText: '11999998888',
        delay: 100,
      ),
      const SizedBox(height: 14),
      _buildGlassField(
        controller: _cpfController,
        label: 'CPF (opcional)',
        icon: Icons.badge_outlined,
        keyboardType: TextInputType.number,
        enabled: !isLoading,
        hintText: '000.000.000-00',
        delay: 150,
      ),
      const SizedBox(height: 14),
      _buildGlassField(
        controller: _passwordController,
        label: 'Senha',
        icon: Icons.lock_outline_rounded,
        enabled: !isLoading,
        obscure: _obscurePassword,
        suffixIcon: IconButton(
          icon: Icon(
            _obscurePassword
                ? Icons.visibility_outlined
                : Icons.visibility_off_outlined,
            size: 20,
            color: Colors.white.withOpacity(0.4),
          ),
          onPressed: () =>
              setState(() => _obscurePassword = !_obscurePassword),
        ),
        helperText: 'Minimo 8 caracteres',
        validator: (v) {
          if (v?.isEmpty == true) return 'Informe a senha';
          if (v!.length < 8) return 'Minimo 8 caracteres';
          return null;
        },
        delay: 200,
      ),
    ];
  }

  Widget _buildGlassField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool enabled = true,
    bool obscure = false,
    TextInputType? keyboardType,
    String? hintText,
    String? helperText,
    Widget? suffixIcon,
    String? Function(String?)? validator,
    int delay = 0,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
        child: TextFormField(
          controller: controller,
          enabled: enabled,
          obscureText: obscure,
          keyboardType: keyboardType,
          style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 15),
          validator: validator,
          decoration: InputDecoration(
            labelText: label,
            hintText: hintText,
            helperText: helperText,
            labelStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.2)),
            helperStyle: TextStyle(color: Colors.white.withOpacity(0.25)),
            errorStyle: const TextStyle(color: Color(0xFFEF4444)),
            prefixIcon:
                Icon(icon, size: 20, color: Colors.white.withOpacity(0.4)),
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: Colors.white.withOpacity(0.06),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide:
                  const BorderSide(color: Color(0xFF667EEA), width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide:
                  const BorderSide(color: Color(0xFFEF4444), width: 1),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide:
                  const BorderSide(color: Color(0xFFEF4444), width: 2),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.04)),
            ),
          ),
        ),
      ),
    ).animate().fadeIn(delay: Duration(milliseconds: delay), duration: 300.ms);
  }

  Widget _buildRegisterButton(bool isLoading) {
    return SizedBox(
      height: 54,
      child: ElevatedButton(
        onPressed: isLoading ? null : _handleRegister,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF667EEA),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
          disabledBackgroundColor:
              const Color(0xFF667EEA).withOpacity(0.5),
        ),
        child: isLoading
            ? const SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Text(
                'Criar conta',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
      ),
    );
  }
}
