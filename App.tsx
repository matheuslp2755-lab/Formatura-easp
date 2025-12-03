import React, { useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { ViewerPage } from './components/ViewerPage';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.VIEWER);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate specific email and password
    if (email === 'atendimentomaxplayer@gmail.com' && password === 'atendimentomaxplayer@gmail.com') {
      setMode(AppMode.ADMIN);
      setError('');
    } else {
      setError('Credenciais inválidas. Verifique o e-mail e a senha.');
    }
  };

  const goToLogin = () => {
    setMode(AppMode.LOGIN);
    setError('');
    setEmail('');
    setPassword('');
  };

  const goToViewer = () => {
    setMode(AppMode.VIEWER);
  };

  if (mode === AppMode.VIEWER) {
    return <ViewerPage onAdminClick={goToLogin} />;
  }

  if (mode === AppMode.ADMIN) {
    return <AdminPanel />;
  }

  // Login Screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Login Administrativo - MPLAY</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Digite a senha..."
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Entrar
          </button>
        </form>
        <div className="mt-4 text-center">
           <button onClick={goToViewer} className="text-gray-500 hover:text-white text-sm underline">
             Voltar para a transmissão
           </button>
        </div>
      </div>
    </div>
  );
};

export default App;