import React from 'react';
import {
  AlertOctagon,   // Erro
  CheckCircle,    // Sucesso
  AlertTriangle   // Alerta
} from 'lucide-react';

const MensagemStatus = ({ tipo, texto }) => {
  let cor = 'text-gray-700';
  let Icone = null;

  switch (tipo) {
    case 'erro':
      cor = 'text-red-600';
      Icone = AlertOctagon;
      break;
    case 'sucesso':
      cor = 'text-green-600';
      Icone = CheckCircle;
      break;
    case 'alerta':
      cor = 'text-orange-500';
      Icone = AlertTriangle;
      break;
    default:
      cor = 'text-gray-700';
  }

  return (
    <div className={\`mt-4 text-center font-semibold flex items-center justify-center gap-2 \${cor}\`}>
      {Icone && <Icone size={20} />}
      <span>{texto}</span>
    </div>
  );
};

export default MensagemStatus;