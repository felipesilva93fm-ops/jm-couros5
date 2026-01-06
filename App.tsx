
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Client, ViewMode } from './types';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { analyzeClientWithAI } from './services/geminiService';

const App: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.LIST);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    whatsapp: '',
    budget: '',
    observation: '',
    image: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('jm_couros_clients');
    if (saved) setClients(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('jm_couros_clients', JSON.stringify(clients));
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => b.createdAt - a.createdAt);
  }, [clients, searchQuery]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOrUpdateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Nome e Telefone são obrigatórios!");
      return;
    }

    if (selectedClient) {
      setClients(prev => prev.map(c => 
        c.id === selectedClient.id ? { ...c, ...formData } as Client : c
      ));
    } else {
      const newClient: Client = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name!,
        phone: formData.phone!,
        email: formData.email || '',
        address: formData.address || '',
        whatsapp: formData.whatsapp || '',
        budget: formData.budget || '',
        observation: formData.observation || '',
        image: formData.image || '',
        createdAt: Date.now()
      };
      setClients(prev => [newClient, ...prev]);
    }
    
    resetForm();
    setCurrentView(ViewMode.LIST);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '', whatsapp: '', budget: '', observation: '', image: '' });
    setSelectedClient(null);
  };

  const handleDeleteClient = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este cliente?")) {
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClient?.id === id) {
        setSelectedClient(null);
        setCurrentView(ViewMode.LIST);
      }
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({ ...client });
    setCurrentView(ViewMode.FORM);
  };

  const handleInsight = async (client: Client) => {
    setIsAnalyzing(true);
    const insight = await analyzeClientWithAI(client);
    const updatedClients = clients.map(c => c.id === client.id ? { ...c, aiInsight: insight } : c);
    setClients(updatedClients);
    setSelectedClient(prev => prev ? { ...prev, aiInsight: insight } : null);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121212] text-white">
      {/* Header JM Couros */}
      <header className="bg-black border-b border-zinc-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => { setCurrentView(ViewMode.LIST); resetForm(); }}
          >
            <div className="border-2 border-yellow-400 p-1.5 rounded-lg group-hover:bg-yellow-400 transition-all">
              <svg className="w-8 h-8 text-yellow-400 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter leading-none">JM<span className="text-yellow-400 font-normal ml-1">couros</span></h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Gestão Profissional</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentView === ViewMode.LIST ? (
              <Button variant="primary" size="md" onClick={() => { resetForm(); setCurrentView(ViewMode.FORM); }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Cadastrar
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => { setCurrentView(ViewMode.LIST); resetForm(); }}>
                Voltar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
        {currentView === ViewMode.LIST && (
          <div className="animate-fade-in">
            {/* Search Bar */}
            <div className="mb-8 relative">
              <input 
                type="text" 
                placeholder="Localizar cliente ou veículo..." 
                className="w-full pl-14 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-yellow-400 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="w-6 h-6 text-yellow-400 absolute left-5 top-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* List Grid */}
            {filteredClients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map(client => (
                  <div 
                    key={client.id} 
                    className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden hover:border-yellow-400/50 transition-all group flex flex-col"
                  >
                    {/* Imagem do Cliente/Veículo */}
                    <div className="h-40 bg-zinc-800 relative overflow-hidden">
                      {client.image ? (
                        <img src={client.image} alt={client.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                           <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {client.budget && (
                        <div className="absolute bottom-2 right-2 bg-yellow-400 text-black px-2 py-0.5 rounded-md text-[10px] font-black uppercase">
                          {client.budget}
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white truncate group-hover:text-yellow-400 transition-colors">{client.name}</h3>
                          <p className="text-sm text-zinc-500 font-medium">{client.phone}</p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleEdit(client)} className="p-1.5 text-zinc-500 hover:text-white transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                           </button>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{new Date(client.createdAt).toLocaleDateString()}</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setSelectedClient(client); setCurrentView(ViewMode.DETAILS); }}
                        >
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-900 rounded-3xl border border-zinc-800 border-dashed">
                <div className="bg-zinc-800 inline-block p-6 rounded-full mb-4">
                  <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">Base de Dados Vazia</h3>
                <p className="text-zinc-500 mt-2">Nenhum cliente cadastrado com esses critérios.</p>
              </div>
            )}
          </div>
        )}

        {currentView === ViewMode.FORM && (
          <div className="max-w-3xl mx-auto bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl animate-scale-up">
            <h2 className="text-3xl font-black italic text-white mb-8 border-l-4 border-yellow-400 pl-4 uppercase">
              {selectedClient ? 'Atualizar Ficha' : 'Novo Cadastro'}
            </h2>
            <form onSubmit={handleAddOrUpdateClient} className="space-y-6">
              
              {/* Image Upload Area */}
              <div 
                className="group relative h-48 w-full bg-zinc-800 rounded-2xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-yellow-400 transition-all overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.image ? (
                  <>
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <p className="text-white font-bold">Alterar Foto do Projeto</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <svg className="w-12 h-12 text-zinc-600 mb-2 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-zinc-500 font-bold uppercase tracking-tight">Anexar Foto do Veículo/Serviço</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div className="md:col-span-2">
                  <div className="mb-4">
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Nome do Cliente *</label>
                    <input 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 transition-all outline-none text-white"
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">E-mail</label>
                    <input 
                      type="email"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 transition-all outline-none text-white"
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Telefone *</label>
                    <input 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 transition-all outline-none text-white"
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">WhatsApp</label>
                    <input 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 transition-all outline-none text-white"
                      value={formData.whatsapp} 
                      onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Orçamento</label>
                    <input 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 transition-all outline-none text-white"
                      value={formData.budget} 
                      onChange={e => setFormData({...formData, budget: e.target.value})}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 mt-4">
                   <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Endereço Completo</label>
                   <input 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 transition-all outline-none text-white"
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 mt-4">
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Observações Técnicas</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-400 transition-all outline-none text-white h-32 resize-none"
                    value={formData.observation} 
                    onChange={e => setFormData({...formData, observation: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" variant="primary" className="flex-1 py-4 text-lg">
                  {selectedClient ? 'Confirmar Alterações' : 'Salvar Cliente'}
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="px-8"
                  onClick={() => { setCurrentView(ViewMode.LIST); resetForm(); }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {currentView === ViewMode.DETAILS && selectedClient && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
              
              {/* Cover Image/Header */}
              <div className="h-[400px] relative">
                {selectedClient.image ? (
                  <img src={selectedClient.image} alt={selectedClient.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-700">
                    <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/40"></div>
                
                <button 
                  onClick={() => setCurrentView(ViewMode.LIST)}
                  className="absolute top-6 left-6 p-2 bg-black/50 hover:bg-yellow-400 hover:text-black rounded-xl transition-all backdrop-blur-md"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>

                <div className="absolute bottom-8 left-8">
                  <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter">
                    {selectedClient.name}
                  </h2>
                  <div className="flex gap-4 mt-2">
                    <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                      {selectedClient.budget || 'Sem Orçamento'}
                    </span>
                    <span className="text-zinc-400 text-sm font-bold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {new Date(selectedClient.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="md:col-span-2 space-y-10">
                    
                    <section>
                      <h3 className="text-xs font-black text-yellow-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <span className="w-8 h-[2px] bg-yellow-400"></span>
                        Informações Gerais
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                          <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Contato Principal</p>
                          <p className="text-white font-bold">{selectedClient.phone}</p>
                          <p className="text-zinc-400 text-sm">{selectedClient.email || 'E-mail não informado'}</p>
                        </div>
                        <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                          <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Localização</p>
                          <p className="text-white font-bold leading-tight">{selectedClient.address || 'Endereço não informado'}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-black text-yellow-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <span className="w-8 h-[2px] bg-yellow-400"></span>
                        Observações Técnicas
                      </h3>
                      <div className="bg-zinc-800/30 p-6 rounded-2xl border border-zinc-800 italic text-zinc-300 leading-relaxed min-h-[100px]">
                        {selectedClient.observation || "Nenhuma especificação técnica registrada."}
                      </div>
                    </section>
                  </div>

                  {/* Sidebar - Actions & AI */}
                  <div className="space-y-6">
                    <div className="bg-zinc-800 p-6 rounded-3xl border border-zinc-700 shadow-xl">
                      <h4 className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 6a4 4 0 100 8 4 4 0 000-8z" />
                        </svg>
                        Estratégia IA
                      </h4>
                      {selectedClient.aiInsight ? (
                        <div className="text-zinc-300 text-xs leading-relaxed mb-4">
                          {selectedClient.aiInsight}
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-[10px] italic mb-4">Gerar uma análise comercial para este perfil.</p>
                      )}
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="w-full text-[10px] py-3"
                        isLoading={isAnalyzing}
                        onClick={() => handleInsight(selectedClient)}
                      >
                        {selectedClient.aiInsight ? 'Recalcular Análise' : 'Gerar Insight'}
                      </Button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="secondary" className="w-full" onClick={() => handleEdit(selectedClient)}>
                        Editar Ficha
                      </Button>
                      <Button variant="danger" className="w-full" onClick={() => handleDeleteClient(selectedClient.id)}>
                        Excluir Registro
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 text-center">
         <div className="flex flex-col items-center gap-2 opacity-30">
            <h4 className="text-sm font-black italic tracking-tighter">JM<span className="text-yellow-400 font-normal ml-1">couros</span></h4>
            <p className="text-[10px] uppercase font-bold tracking-widest">&copy; {new Date().getFullYear()} - Sistema de Gestão Interna</p>
         </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        body { background-color: #121212; color: white; }
      `}</style>
    </div>
  );
};

export default App;
