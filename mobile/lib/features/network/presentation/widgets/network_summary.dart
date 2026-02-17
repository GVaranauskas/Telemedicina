import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/medconnect_theme.dart';

class NetworkSummary extends StatelessWidget {
  const NetworkSummary({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Network Stats
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  MedConnectColors.primary,
                  MedConnectColors.primary.withBlue(180),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              children: [
                const Row(
                  children: [
                    Icon(Icons.hub, color: Colors.white),
                    SizedBox(width: 8),
                    Text(
                      'Sua Rede Profissional',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildNetworkStat('128', 'Conexões', Icons.people),
                    _buildNetworkStat('342', 'Seguidores', Icons.person_add),
                    _buildNetworkStat('56', 'Endossos', Icons.verified),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Suggestions
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Sugestões para Conectar',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              TextButton(
                onPressed: () => context.push('/network'),
                child: const Text('Ver todos'),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Connection Cards
          SizedBox(
            height: 200,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildConnectionCard(
                  name: 'Dr. Roberto Santos',
                  specialty: 'Neurologista',
                  mutualConnections: 12,
                ),
                _buildConnectionCard(
                  name: 'Dra. Juliana Lima',
                  specialty: 'Cardiologista',
                  mutualConnections: 8,
                ),
                _buildConnectionCard(
                  name: 'Dr. Pedro Costa',
                  specialty: 'Ortopedista',
                  mutualConnections: 15,
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Study Groups
          const Text(
            'Grupos de Estudo',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          _buildStudyGroupCard(
            name: 'Cardiologia Avançada',
            members: 124,
            icon: Icons.favorite,
            color: Colors.red,
          ),
          const SizedBox(height: 8),
          _buildStudyGroupCard(
            name: 'Neurociência Clínica',
            members: 89,
            icon: Icons.psychology,
            color: Colors.purple,
          ),
        ],
      ),
    ).animate().fadeIn();
  }

  Widget _buildNetworkStat(String value, String label, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: 28),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withAlpha(179),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildConnectionCard({
    required String name,
    required String specialty,
    required int mutualConnections,
  }) {
    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: MedConnectColors.neutral200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: MedConnectColors.primary.withAlpha(26),
            child: Text(
              name.substring(0, 1),
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: MedConnectColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            name,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            specialty,
            style: TextStyle(
              fontSize: 11,
              color: MedConnectColors.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$mutualConnections conexões em comum',
            style: TextStyle(
              fontSize: 10,
              color: MedConnectColors.textTertiary,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: MedConnectColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text('Conectar', style: TextStyle(fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudyGroupCard({
    required String name,
    required int members,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: MedConnectColors.neutral200),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withAlpha(26),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '$members membros',
                  style: TextStyle(
                    fontSize: 12,
                    color: MedConnectColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.arrow_forward_ios, size: 16),
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}
