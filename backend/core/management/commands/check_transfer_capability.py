"""
Comando para verificar a capacidade de transferência de todos os provedores
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import Provedor
from core.transfer_service import transfer_service
import json

class Command(BaseCommand):
    help = 'Verifica a capacidade de transferência de todos os provedores'

    def add_arguments(self, parser):
        parser.add_argument(
            '--provedor-id',
            type=int,
            help='Verificar apenas um provedor específico por ID'
        )
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Mostrar relatório detalhado'
        )
        parser.add_argument(
            '--fix-suggestions',
            action='store_true',
            help='Mostrar sugestões de correção'
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🔍 Verificando capacidade de transferência dos provedores...')
        )
        
        if options['provedor_id']:
            provedores = Provedor.objects.filter(id=options['provedor_id'], is_active=True)
            if not provedores.exists():
                self.stdout.write(
                    self.style.ERROR(f'❌ Provedor com ID {options["provedor_id"]} não encontrado')
                )
                return
        else:
            provedores = Provedor.objects.filter(is_active=True)
        
        total_provedores = provedores.count()
        self.stdout.write(f'📊 Total de provedores ativos: {total_provedores}')
        
        overall_summary = {
            'total_provedores': total_provedores,
            'provedores_verificados': 0,
            'capability_scores': [],
            'critical_issues': [],
            'recommendations': []
        }
        
        for provedor in provedores:
            self.stdout.write(f'\n🏢 Verificando provedor: {provedor.nome} (ID: {provedor.id})')
            
            try:
                capability_report = transfer_service.check_provedor_transfer_capability(provedor)
                
                if not capability_report:
                    self.stdout.write(
                        self.style.WARNING(f'⚠️  Não foi possível verificar o provedor {provedor.nome}')
                    )
                    continue
                
                overall_summary['provedores_verificados'] += 1
                
                # Score de capacidade
                score = capability_report.get('capability_score', 0)
                level = capability_report.get('capability_level', 'DESCONHECIDO')
                overall_summary['capability_scores'].append(score)
                
                # Mostrar score
                if score >= 90:
                    score_style = self.style.SUCCESS
                elif score >= 75:
                    score_style = self.style.WARNING
                elif score >= 50:
                    score_style = self.style.WARNING
                else:
                    score_style = self.style.ERROR
                
                self.stdout.write(
                    score_style(f'📈 Capacidade: {score}% ({level})')
                )
                
                # Equipes disponíveis
                available_teams = capability_report.get('available_teams', [])
                if available_teams:
                    self.stdout.write(f'✅ Equipes disponíveis: {len(available_teams)}')
                    for team_info in available_teams:
                        team = team_info['team']
                        team_type = team_info['type']
                        self.stdout.write(f'   • {team["name"]} ({team_type})')
                
                # Equipes faltando
                missing_teams = capability_report.get('missing_teams', [])
                if missing_teams:
                    self.stdout.write(f'❌ Equipes faltando: {len(missing_teams)}')
                    for missing in missing_teams:
                        priority_icon = "🔴" if missing['priority'] <= 1 else "🟡" if missing['priority'] <= 2 else "🟢"
                        self.stdout.write(f'   {priority_icon} {missing["type"]}: {missing["description"]}')
                        
                        if missing['priority'] <= 1:
                            overall_summary['critical_issues'].append({
                                'provedor': provedor.nome,
                                'provedor_id': provedor.id,
                                'missing_type': missing['type'],
                                'priority': missing['priority']
                            })
                
                # Recomendações
                recommendations = capability_report.get('recommendations', [])
                if recommendations and options['fix_suggestions']:
                    self.stdout.write(f'💡 Recomendações:')
                    for rec in recommendations:
                        self.stdout.write(f'   • {rec}')
                        overall_summary['recommendations'].append({
                            'provedor': provedor.nome,
                            'provedor_id': provedor.id,
                            'recommendation': rec
                        })
                
                # Relatório detalhado
                if options['detailed']:
                    self.stdout.write(f'\n📋 Relatório detalhado para {provedor.nome}:')
                    self.stdout.write(json.dumps(capability_report, indent=2, ensure_ascii=False))
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Erro ao verificar provedor {provedor.nome}: {str(e)}')
                )
        
        # Resumo geral
        self.stdout.write(f'\n{"="*60}')
        self.stdout.write(self.style.SUCCESS('📊 RESUMO GERAL'))
        self.stdout.write(f'{"="*60}')
        
        if overall_summary['capability_scores']:
            avg_score = sum(overall_summary['capability_scores']) / len(overall_summary['capability_scores'])
            self.stdout.write(f'📈 Score médio de capacidade: {avg_score:.1f}%')
            
            # Distribuição por nível
            excellent = len([s for s in overall_summary['capability_scores'] if s >= 90])
            good = len([s for s in overall_summary['capability_scores'] if 75 <= s < 90])
            regular = len([s for s in overall_summary['capability_scores'] if 50 <= s < 75])
            limited = len([s for s in overall_summary['capability_scores'] if 25 <= s < 50])
            critical = len([s for s in overall_summary['capability_scores'] if s < 25])
            
            self.stdout.write(f'🏆 Excelente (90%+): {excellent} provedores')
            self.stdout.write(f'👍 Bom (75-89%): {good} provedores')
            self.stdout.write(f'⚠️  Regular (50-74%): {regular} provedores')
            self.stdout.write(f'🔶 Limitado (25-49%): {limited} provedores')
            self.stdout.write(f'🚨 Crítico (<25%): {critical} provedores')
        
        # Problemas críticos
        if overall_summary['critical_issues']:
            self.stdout.write(f'\n🔴 PROBLEMAS CRÍTICOS ENCONTRADOS:')
            for issue in overall_summary['critical_issues']:
                self.stdout.write(
                    f'   • {issue["provedor"]}: Falta equipe para {issue["missing_type"]} (Prioridade: {issue["priority"]})'
                )
        
        # Recomendações gerais
        if overall_summary['recommendations'] and options['fix_suggestions']:
            self.stdout.write(f'\n💡 RECOMENDAÇÕES GERAIS:')
            for rec in overall_summary['recommendations']:
                self.stdout.write(f'   • {rec["provedor"]}: {rec["recommendation"]}')
        
        self.stdout.write(
            self.style.SUCCESS(f'\n✅ Verificação concluída! {overall_summary["provedores_verificados"]}/{total_provedores} provedores verificados')
        )
