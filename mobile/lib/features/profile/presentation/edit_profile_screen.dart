import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/providers/doctor_provider.dart';
import '../../../core/models/doctor_model.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _bioController;
  late TextEditingController _phoneController;
  late TextEditingController _cityController;
  late TextEditingController _stateController;
  late TextEditingController _universityController;
  late TextEditingController _gradYearController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final doctor = ref.read(profileProvider).doctor;
    _bioController = TextEditingController(text: doctor?.bio ?? '');
    _phoneController = TextEditingController(text: doctor?.phone ?? '');
    _cityController = TextEditingController(text: doctor?.city ?? '');
    _stateController = TextEditingController(text: doctor?.state ?? '');
    _universityController =
        TextEditingController(text: doctor?.universityName ?? '');
    _gradYearController = TextEditingController(
        text: doctor?.graduationYear?.toString() ?? '');
  }

  @override
  void dispose() {
    _bioController.dispose();
    _phoneController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _universityController.dispose();
    _gradYearController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final data = <String, dynamic>{};

    if (_bioController.text.isNotEmpty) data['bio'] = _bioController.text;
    if (_phoneController.text.isNotEmpty) data['phone'] = _phoneController.text;
    if (_cityController.text.isNotEmpty) data['city'] = _cityController.text;
    if (_stateController.text.isNotEmpty) data['state'] = _stateController.text;
    if (_universityController.text.isNotEmpty) {
      data['universityName'] = _universityController.text;
    }
    if (_gradYearController.text.isNotEmpty) {
      data['graduationYear'] = int.tryParse(_gradYearController.text);
    }

    await ref.read(profileProvider.notifier).updateProfile(data);

    if (mounted) {
      setState(() => _isSaving = false);
      context.pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Perfil atualizado')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Editar Perfil'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Salvar'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildField('Sobre mim', _bioController, maxLines: 4),
              _buildField('Telefone', _phoneController),
              _buildField('Cidade', _cityController),
              _buildField('Estado (UF)', _stateController),
              _buildField('Universidade', _universityController),
              _buildField('Ano de Graduacao', _gradYearController,
                  keyboardType: TextInputType.number),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller,
      {int maxLines = 1, TextInputType? keyboardType}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTextStyles.labelMedium),
          const SizedBox(height: 8),
          TextFormField(
            controller: controller,
            maxLines: maxLines,
            keyboardType: keyboardType,
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppColors.border),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ],
      ),
    );
  }
}
