import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authProvider.notifier).login(
          _emailController.text.trim(),
          _passwordController.text,
        );

    if (mounted && success) {
      final user = ref.read(authProvider).user;
      if (user?.isPatient == true) {
        context.go('/patient/home');
      } else {
        context.go('/home');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    ref.listen<AuthState>(authProvider, (prev, next) {
      if (next.error != null && prev?.error != next.error) {
        _showErrorSnackBar(next.error!);
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFF0A0E21),
      body: Stack(
        children: [
          // Background gradient
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF0A0E21),
                  Color(0xFF1A1A3E),
                  Color(0xFF0D1B2A),
                ],
              ),
            ),
          ),

          // Decorative orbs
          Positioned(
            top: -80,
            left: -60,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF667EEA).withOpacity(0.1),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -40,
            right: -80,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF764BA2).withOpacity(0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Subtle particles
          ...List.generate(8, (i) {
            final positions = [
              [0.15, 0.1], [0.85, 0.08], [0.05, 0.45],
              [0.92, 0.35], [0.2, 0.7], [0.75, 0.65],
              [0.5, 0.15], [0.4, 0.85],
            ];
            return Positioned(
              left: MediaQuery.of(context).size.width * positions[i][0],
              top: MediaQuery.of(context).size.height * positions[i][1],
              child: Container(
                width: 3,
                height: 3,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.12),
                ),
              ),
            );
          }),

          // Content
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 80),
                    _buildHeader()
                        .animate()
                        .fadeIn(duration: 600.ms)
                        .slideY(begin: -0.1),
                    const SizedBox(height: 56),
                    _buildEmailField(authState.isLoading)
                        .animate()
                        .fadeIn(delay: 200.ms, duration: 400.ms),
                    const SizedBox(height: 16),
                    _buildPasswordField(authState.isLoading)
                        .animate()
                        .fadeIn(delay: 300.ms, duration: 400.ms),
                    const SizedBox(height: 32),
                    _buildLoginButton(authState.isLoading)
                        .animate()
                        .fadeIn(delay: 400.ms, duration: 400.ms),
                    const SizedBox(height: 28),
                    _buildRegisterLink()
                        .animate()
                        .fadeIn(delay: 500.ms, duration: 400.ms),
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
        Container(
          width: 68,
          height: 68,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF667EEA).withOpacity(0.35),
                blurRadius: 24,
                spreadRadius: 0,
              ),
            ],
          ),
          child: const Icon(
            Icons.favorite_rounded,
            size: 32,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 28),
        const Text(
          'MedConnect',
          style: TextStyle(
            color: Colors.white,
            fontSize: 30,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Conectando voce ao cuidado ideal',
          style: TextStyle(
            color: Colors.white.withOpacity(0.4),
            fontSize: 15,
          ),
        ),
      ],
    );
  }

  Widget _buildEmailField(bool isLoading) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
        child: TextFormField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          enabled: !isLoading,
          style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 15),
          decoration: InputDecoration(
            labelText: 'E-mail',
            hintText: 'seu@email.com',
            labelStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.2)),
            errorStyle: const TextStyle(color: Color(0xFFEF4444)),
            prefixIcon: Icon(Icons.email_outlined,
                size: 20, color: Colors.white.withOpacity(0.4)),
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
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.04)),
            ),
          ),
          validator: (value) {
            if (value == null || value.isEmpty) return 'Informe o e-mail';
            if (!value.contains('@')) return 'E-mail invalido';
            return null;
          },
        ),
      ),
    );
  }

  Widget _buildPasswordField(bool isLoading) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
        child: TextFormField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          enabled: !isLoading,
          style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 15),
          decoration: InputDecoration(
            labelText: 'Senha',
            hintText: 'Sua senha',
            labelStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.2)),
            errorStyle: const TextStyle(color: Color(0xFFEF4444)),
            prefixIcon: Icon(Icons.lock_outlined,
                size: 20, color: Colors.white.withOpacity(0.4)),
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
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.04)),
            ),
          ),
          onFieldSubmitted: (_) => _handleLogin(),
          validator: (value) {
            if (value == null || value.isEmpty) return 'Informe a senha';
            if (value.length < 8) return 'Minimo 8 caracteres';
            return null;
          },
        ),
      ),
    );
  }

  Widget _buildLoginButton(bool isLoading) {
    return SizedBox(
      height: 54,
      child: ElevatedButton(
        onPressed: isLoading ? null : _handleLogin,
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
                'Entrar',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
      ),
    );
  }

  Widget _buildRegisterLink() {
    return Column(
      children: [
        // Doctor registration
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Sou medico ',
              style: TextStyle(
                color: Colors.white.withOpacity(0.35),
                fontSize: 14,
              ),
            ),
            GestureDetector(
              onTap: () => context.push('/register'),
              child: const Text(
                'Criar conta medica',
                style: TextStyle(
                  color: Color(0xFF667EEA),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        // Patient registration
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Sou paciente ',
              style: TextStyle(
                color: Colors.white.withOpacity(0.35),
                fontSize: 14,
              ),
            ),
            GestureDetector(
              onTap: () => context.push('/register/patient'),
              child: const Text(
                'Buscar medicos',
                style: TextStyle(
                  color: Color(0xFF00C9FF),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFFEF4444).withOpacity(0.9),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    );
  }
}
