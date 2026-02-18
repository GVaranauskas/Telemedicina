import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/medconnect_theme.dart';

class FeedList extends ConsumerWidget {
  const FeedList({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Mock posts for demonstration
    final posts = [
      {
        'author': 'Dra. Maria Silva',
        'avatar': 'M',
        'specialty': 'Cardiologista',
        'time': '2h',
        'content': 'Caso interessante de hoje: paciente 67 anos com disfunção sistólica moderada e fibrilação atrial. Optamos por anticoagulação direta após avaliação do CHA2DS2-VASc.',
        'likes': 24,
        'comments': 8,
        'shares': 3,
        'tags': ['Cardiologia', 'ECG', 'Caso Clínico'],
      },
      {
        'author': 'Dr. Carlos Oliveira',
        'avatar': 'C',
        'specialty': 'Neurologista',
        'time': '4h',
        'content': 'Alguém tem experiência com o novo protocolo de trombólise extendida? Estamos implementando na nossa unidade e gostaria de trocar experiências.',
        'likes': 18,
        'comments': 12,
        'shares': 5,
        'tags': ['Neurologia', 'AVC', 'Protocolo'],
      },
      {
        'author': 'Dra. Ana Costa',
        'avatar': 'A',
        'specialty': 'Pediatra',
        'time': '6h',
        'content': 'Compartilhando artigo interessante sobre novas diretrizes de vacinação pediátrica 2024. Link nos comentários!',
        'likes': 45,
        'comments': 15,
        'shares': 22,
        'tags': ['Pediatria', 'Vacinação', 'Diretrizes'],
        'hasImage': true,
      },
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Feed de Atividades',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              TextButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.tune, size: 18),
                label: const Text('Filtrar'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...posts.asMap().entries.map((entry) {
            return _buildPostCard(entry.value, entry.key);
          }),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildPostCard(Map<String, dynamic> post, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(13),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: _getAvatarColor(post['avatar'] as String),
                child: Text(
                  post['avatar'] as String,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post['author'] as String,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '${post['specialty']} • ${post['time']}',
                      style: TextStyle(
                        fontSize: 12,
                        color: MedConnectColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.more_vert),
                onPressed: () {},
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Content
          Text(
            post['content'] as String,
            style: const TextStyle(
              fontSize: 14,
              height: 1.5,
            ),
          ),

          // Image placeholder if has image
          if (post['hasImage'] == true) ...[
            const SizedBox(height: 12),
            Container(
              height: 180,
              width: double.infinity,
              decoration: BoxDecoration(
                color: MedConnectColors.primary.withAlpha(26),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.article,
                    size: 48,
                    color: MedConnectColors.primary.withAlpha(128),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Visualização do artigo',
                    style: TextStyle(
                      color: MedConnectColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Tags
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: (post['tags'] as List<String>).map((tag) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: MedConnectColors.primary.withAlpha(26),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  tag,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: MedConnectColors.primary,
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 8),

          // Actions
          Row(
            children: [
              _buildActionButton(
                Icons.favorite_border,
                '${post['likes']}',
                () {},
              ),
              const SizedBox(width: 24),
              _buildActionButton(
                Icons.chat_bubble_outline,
                '${post['comments']}',
                () {},
              ),
              const SizedBox(width: 24),
              _buildActionButton(
                Icons.share_outlined,
                '${post['shares']}',
                () {},
              ),
              const Spacer(),
              _buildActionButton(
                Icons.bookmark_border,
                '',
                () {},
              ),
            ],
          ),
        ],
      ),
    ).animate(delay: (index * 100).ms).fadeIn().slideY(begin: 0.2);
  }

  Widget _buildActionButton(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Row(
        children: [
          Icon(
            icon,
            size: 20,
            color: MedConnectColors.textSecondary,
          ),
          if (label.isNotEmpty) ...[
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: MedConnectColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getAvatarColor(String letter) {
    final colors = [
      const Color(0xFF667eea),
      const Color(0xFFf093fb),
      const Color(0xFF4facfe),
      const Color(0xFF43e97b),
      const Color(0xFFfa709a),
    ];
    return colors[letter.codeUnitAt(0) % colors.length];
  }
}
