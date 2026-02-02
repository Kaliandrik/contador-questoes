import React, { useState, useEffect, useCallback } from 'react';
import { saveToFirebase, loadFromFirebase, resetFirebaseData } from './firebase';
import './App.css';

function App() {
  // Estados para armazenar as contagens
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [firebaseData, setFirebaseData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Conectando...');

  // Carregar dados quando o componente é montado
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setConnectionStatus('Conectando ao Firebase...');
      
      // 1. Primeiro carrega do localStorage (rápido)
      const savedCorrect = parseInt(localStorage.getItem('correctCount') || '0');
      const savedIncorrect = parseInt(localStorage.getItem('incorrectCount') || '0');
      const savedTimestamp = parseInt(localStorage.getItem('dataTimestamp') || '0');
      
      // 2. Carrega do Firebase
      try {
        setConnectionStatus('Sincronizando com a nuvem...');
        const firebaseData = await loadFromFirebase();
        setFirebaseData(firebaseData);
        
        // Lógica de resolução de conflitos:
        // Se o Firebase tem dados mais recentes (baseado no timestamp)
        // OU se o Firebase tem mais questões totais, usa os dados do Firebase
        const localTotal = savedCorrect + savedIncorrect;
        const firebaseTotal = firebaseData.correctCount + firebaseData.incorrectCount;
        
        if (firebaseTotal > localTotal || 
            (firebaseData.lastUpdated && Date.parse(firebaseData.lastUpdated) > savedTimestamp)) {
          // Firebase tem dados mais atualizados
          setCorrectCount(firebaseData.correctCount);
          setIncorrectCount(firebaseData.incorrectCount);
          localStorage.setItem('correctCount', firebaseData.correctCount.toString());
          localStorage.setItem('incorrectCount', firebaseData.incorrectCount.toString());
          localStorage.setItem('dataTimestamp', Date.now().toString());
          console.log('📡 Usando dados do Firebase (mais atualizados)');
        } else {
          // LocalStorage tem dados mais atualizados ou iguais
          setCorrectCount(savedCorrect);
          setIncorrectCount(savedIncorrect);
          console.log('💾 Usando dados do localStorage');
        }
        
        if (firebaseData.lastUpdated) {
          const date = new Date(firebaseData.lastUpdated);
          setLastSaved(date.toLocaleTimeString());
        }
        
        setConnectionStatus('Conectado ✓');
        
      } catch (error) {
        console.error('Erro ao conectar com Firebase:', error);
        setConnectionStatus('Modo offline (usando cache local)');
        
        // Fallback para localStorage
        setCorrectCount(savedCorrect);
        setIncorrectCount(savedIncorrect);
      }
      
      setLoading(false);
    };
    
    loadAllData();
  }, []);

  // Função para salvar dados
  const saveData = useCallback(async (correct, incorrect) => {
    // Salva no localStorage primeiro
    localStorage.setItem('correctCount', correct.toString());
    localStorage.setItem('incorrectCount', incorrect.toString());
    localStorage.setItem('dataTimestamp', Date.now().toString());
    
    // Tenta salvar no Firebase
    try {
      const saved = await saveToFirebase(correct, incorrect);
      if (saved) {
        setLastSaved(new Date().toLocaleTimeString());
        setConnectionStatus('Conectado ✓');
      }
    } catch (error) {
      console.error('Falha ao salvar no Firebase:', error);
      setConnectionStatus('Modo offline (dados salvos localmente)');
    }
  }, []);

  // Salvar dados quando as contagens mudam (com debounce)
  useEffect(() => {
    if (!loading && (correctCount > 0 || incorrectCount > 0)) {
      const timer = setTimeout(() => {
        saveData(correctCount, incorrectCount);
      }, 1500); // Aguarda 1.5 segundos antes de salvar
      
      return () => clearTimeout(timer);
    }
  }, [correctCount, incorrectCount, loading, saveData]);

  // Funções para manipular as contagens
  const handleCorrect = () => {
    setCorrectCount(prev => prev + 1);
  };

  const handleIncorrect = () => {
    setIncorrectCount(prev => prev + 1);
  };

  const handleReset = async () => {
    if (window.confirm("Tem certeza que deseja resetar TODAS as contagens?\n\nIsso irá:"
      + "\n• Zerar os contadores localmente"
      + "\n• Zerar os contadores na nuvem"
      + "\n• Apagar todo o histórico")) {
      
      setLoading(true);
      setConnectionStatus('Resetando dados...');
      
      // Reseta localmente
      setCorrectCount(0);
      setIncorrectCount(0);
      localStorage.setItem('correctCount', '0');
      localStorage.setItem('incorrectCount', '0');
      localStorage.setItem('dataTimestamp', Date.now().toString());
      
      // Reseta no Firebase
      try {
        await resetFirebaseData();
        setLastSaved(new Date().toLocaleTimeString());
        alert('✅ Todos os dados foram resetados com sucesso!');
      } catch (error) {
        alert('⚠️ Dados resetados localmente, mas houve um erro na nuvem.');
      }
      
      setLoading(false);
      setConnectionStatus('Conectado ✓');
    }
  };

  // Função para sincronizar manualmente
  const handleSync = async () => {
    setLoading(true);
    setConnectionStatus('Sincronizando...');
    
    try {
      const firebaseData = await loadFromFirebase();
      setFirebaseData(firebaseData);
      
      // Atualiza com os dados do Firebase
      setCorrectCount(firebaseData.correctCount);
      setIncorrectCount(firebaseData.incorrectCount);
      
      // Atualiza localStorage
      localStorage.setItem('correctCount', firebaseData.correctCount.toString());
      localStorage.setItem('incorrectCount', firebaseData.incorrectCount.toString());
      localStorage.setItem('dataTimestamp', Date.now().toString());
      
      if (firebaseData.lastUpdated) {
        const date = new Date(firebaseData.lastUpdated);
        setLastSaved(date.toLocaleTimeString());
      }
      
      setConnectionStatus('Conectado ✓');
      alert('✅ Dados sincronizados com sucesso!');
    } catch (error) {
      setConnectionStatus('Erro na sincronização');
      alert('❌ Erro ao sincronizar: ' + error.message);
    }
    
    setLoading(false);
  };

  // Cálculos para estatísticas
  const totalQuestions = correctCount + incorrectCount;
  const successRate = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="App">
      <h1>📊 Contador de Questões</h1>
      
      <div className={`status-bar ${connectionStatus.includes('offline') ? 'offline' : ''}`}>
        {loading ? (
          <div className="loading">
            <div className="spin
            ner"></div>
            <span>Carregando...</span>
          </div>
        ) : (
          <div className="connection-info">
            <span className="status-indicator">●</span>
            <span className="status-text">{connectionStatus}</span>
            {lastSaved && (
              <span className="last-saved"> | Última sincronição: {lastSaved}</span>
            )}
          </div>
        )}
      </div>
      
      <div className="counter-container">
        {/* Círculo verde para acertos */}
        <div className="circle correct-circle">
          <span className="count">{correctCount}</span>
          <p>Acertos</p>
          <div className="circle-subtitle">✓ Corretas</div>
        </div>
        
        {/* Círculo vermelho para erros */}
        <div className="circle incorrect-circle">
          <span className="count">{incorrectCount}</span>
          <p>Erros</p>
          <div className="circle-subtitle">✗ Incorretas</div>
        </div>
      </div>
      
      <div className="controls">
        <button className="btn correct-btn" onClick={handleCorrect} disabled={loading}>
          <span className="btn-icon">✓</span> Acertou
        </button>
        <button className="btn incorrect-btn" onClick={handleIncorrect} disabled={loading}>
          <span className="btn-icon">✗</span> Errou
        </button>
        <button className="btn sync-btn" onClick={handleSync} disabled={loading}>
          <span className="btn-icon">🔄</span> Sincronizar
        </button>
        <button className="btn reset-btn" onClick={handleReset} disabled={loading}>
          <span className="btn-icon">🗑️</span> Resetar Tudo
        </button>
      </div>
      
      <div className="stats-container">
        <div className="stat-card">
          <h3>Total de Questões</h3>
          <p className="stat-number" id="total">{totalQuestions}</p>
        </div>
        <div className="stat-card">
          <h3>Taxa de Acerto</h3>
          <p className="stat-number" id="rate">{successRate}%</p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${successRate}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="instructions">
        <h3>📝 Como usar:</h3>
        <div className="instruction-steps">
          <div className="step">
            <span className="step-number">1</span>
            <p>Clique em <strong>"Acertou"</strong> ou <strong>"Errou"</strong> para registrar cada questão</p>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <p>Os dados são salvos automaticamente no seu navegador <strong>E</strong> na nuvem (Firebase)</p>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <p>Use <strong>"Sincronizar"</strong> para forçar uma atualização dos dados da nuvem</p>
          </div>
          <div className="step">
            <span className="step-number">4</span>
            <p>Seus dados estarão disponíveis em qualquer dispositivo!</p>
          </div>
        </div>
        
        {firebaseData && (
          <div className="firebase-info">
            <p><small>Firebase Project: <code>contadorquestoes</code></small></p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;