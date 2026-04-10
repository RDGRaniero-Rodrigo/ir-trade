import { NotaCorretagem, ResumoDashboard, ResumoMensal, Usuario } from '@/types';

export const usuarioMock: Usuario = {
  id: '1',
  nome: 'Rodrigo',
  email: 'rodrigo@email.com',
};

export const resumoDashboardMock: ResumoDashboard = {
  resultadoDia: 847.5,
  resultadoMes: 4235.8,
  resultadoAno: 28450.0,
  irrfMes: 42.36,
  darfProjetada: 804.8,
  lucroLiquido: 3388.64,
  prejuizoAcumulado: 0,
};

export const notasMock: NotaCorretagem[] = [
  {
    id: '1',
    numeroNota: '1847362',
    codigoCliente: '12345678',
    dataPregao: '2026-04-01',
    ativo: 'WIN',
    resultadoBruto: 920.0,
    custos: 72.5,
    resultadoLiquido: 847.5,
    irrf: 9.2,
    status: 'processado',
    criadoEm: '2026-04-01T18:30:00',
  },
  {
    id: '2',
    numeroNota: '1847251',
    codigoCliente: '12345678',
    dataPregao: '2026-03-31',
    ativo: 'WDO',
    resultadoBruto: 1250.0,
    custos: 85.3,
    resultadoLiquido: 1164.7,
    irrf: 12.5,
    status: 'processado',
    criadoEm: '2026-03-31T18:15:00',
  },
  {
    id: '3',
    numeroNota: '1847198',
    codigoCliente: '12345678',
    dataPregao: '2026-03-28',
    ativo: 'BIT',
    resultadoBruto: 720.0,
    custos: 58.4,
    resultadoLiquido: 661.6,
    irrf: 7.2,
    status: 'processado',
    criadoEm: '2026-03-26T18:10:00',
  },
];

export const historicoMensalMock: ResumoMensal[] = [
  { mes: 'Out', resultadoBruto: 3200, custos: 450, resultadoLiquido: 2750, irrf: 27.5, darf: 522.5, lucroLiquido: 2200 },
  { mes: 'Nov', resultadoBruto: -1500, custos: 380, resultadoLiquido: -1880, irrf: 0, darf: 0, lucroLiquido: -1880 },
  { mes: 'Dez', resultadoBruto: 4800, custos: 520, resultadoLiquido: 4280, irrf: 42.8, darf: 813.2, lucroLiquido: 3424 },
  { mes: 'Jan', resultadoBruto: 2100, custos: 410, resultadoLiquido: 1690, irrf: 16.9, darf: 321.1, lucroLiquido: 1352 },
  { mes: 'Fev', resultadoBruto: 5600, custos: 580, resultadoLiquido: 5020, irrf: 50.2, darf: 953.8, lucroLiquido: 4016 },
  { mes: 'Mar', resultadoBruto: 4900, custos: 490, resultadoLiquido: 4410, irrf: 44.1, darf: 837.9, lucroLiquido: 3528 },
];