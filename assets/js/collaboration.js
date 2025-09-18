// collaboration.js - Collaboration and Community Features for Dataconecta

class CollaborationPlatform {
    constructor() {
        this.collaborators = new Map();
        this.workspaces = new Map();
        this.discussions = new Map();
        this.knowledgeBase = new Map();
        this.notifications = [];
        this.userProfile = this.loadUserProfile();
        this.isOnline = navigator.onLine;
        this.config = {
            enableRealTimeCollaboration: true,
            enableKnowledgeSharing: true,
            enableCommunityForum: true,
            enableUserProfiles: true,
            maxFileSize: 50 * 1024 * 1024, // 50MB
            allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv']
        };
        this.init();
    }

    init() {
        this.createCollaborationInterface();
        this.setupRealTimeFeatures();
        this.setupKnowledgeBase();
        this.setupCommunityForum();
        this.setupFileSharing();
        this.setupNotificationSystem();
        this.setupOnlineStatus();
        console.log('Collaboration Platform initialized');
    }

    createCollaborationInterface() {
        const collabContainer = document.createElement('div');
        collabContainer.id = 'collaboration-container';
        collabContainer.className = 'collaboration-container';
        collabContainer.innerHTML = `
            <div class="collab-toggle" id="collab-toggle">
                <i class="bi bi-people"></i>
                <span class="collab-notification" id="collab-notification">0</span>
            </div>
            <div class="collab-panel" id="collab-panel">
                <div class="collab-header">
                    <h3>Colaboración</h3>
                    <div class="collab-status">
                        <span class="status-indicator" id="online-status"></span>
                        <span id="online-count">0 en línea</span>
                    </div>
                    <button class="collab-close" id="collab-close">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="collab-tabs">
                    <button class="collab-tab active" data-tab="workspace">Workspace</button>
                    <button class="collab-tab" data-tab="knowledge">Conocimiento</button>
                    <button class="collab-tab" data-tab="forum">Foro</button>
                    <button class="collab-tab" data-tab="files">Archivos</button>
                </div>
                <div class="collab-content">
                    <div class="collab-tab-content active" id="workspace-tab">
                        <div class="workspace-header">
                            <input type="text" id="workspace-search" placeholder="Buscar en workspace...">
                            <button id="create-workspace" class="collab-btn primary">
                                <i class="bi bi-plus"></i> Nuevo
                            </button>
                        </div>
                        <div class="workspace-list" id="workspace-list"></div>
                        <div class="active-collaborators">
                            <h4>Colaboradores Activos</h4>
                            <div class="collaborator-list" id="collaborator-list"></div>
                        </div>
                    </div>
                    
                    <div class="collab-tab-content" id="knowledge-tab">
                        <div class="knowledge-header">
                            <input type="text" id="knowledge-search" placeholder="Buscar en base de conocimiento...">
                            <button id="add-knowledge" class="collab-btn primary">
                                <i class="bi bi-lightbulb"></i> Agregar
                            </button>
                        </div>
                        <div class="knowledge-categories">
                            <button class="category-btn active" data-category="all">Todos</button>
                            <button class="category-btn" data-category="tutorials">Tutoriales</button>
                            <button class="category-btn" data-category="best-practices">Mejores Prácticas</button>
                            <button class="category-btn" data-category="tools">Herramientas</button>
                            <button class="category-btn" data-category="resources">Recursos</button>
                        </div>
                        <div class="knowledge-list" id="knowledge-list"></div>
                    </div>
                    
                    <div class="collab-tab-content" id="forum-tab">
                        <div class="forum-header">
                            <input type="text" id="forum-search" placeholder="Buscar en foro...">
                            <button id="new-discussion" class="collab-btn primary">
                                <i class="bi bi-chat-left-text"></i> Nueva Discusión
                            </button>
                        </div>
                        <div class="forum-categories">
                            <button class="category-btn active" data-category="general">General</button>
                            <button class="category-btn" data-category="help">Ayuda</button>
                            <button class="category-btn" data-category="projects">Proyectos</button>
                            <button class="category-btn" data-category="showcase">Showcase</button>
                        </div>
                        <div class="discussion-list" id="discussion-list"></div>
                    </div>
                    
                    <div class="collab-tab-content" id="files-tab">
                        <div class="files-header">
                            <input type="file" id="file-upload" multiple style="display: none;">
                            <button id="upload-file" class="collab-btn primary">
                                <i class="bi bi-cloud-upload"></i> Subir Archivo
                            </button>
                            <button id="create-folder" class="collab-btn">
                                <i class="bi bi-folder-plus"></i> Nueva Carpeta
                            </button>
                        </div>
                        <div class="file-explorer" id="file-explorer">
                            <div class="breadcrumb" id="file-breadcrumb">
                                <span class="breadcrumb-item active">Inicio</span>
                            </div>
                            <div class="file-list" id="file-list"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        collabContainer.style.display = 'none';
        document.body.appendChild(collabContainer);
        this.addCollaborationStyles();
        this.setupCollaborationEventListeners();
    }

    addCollaborationStyles() {
        const styles = `
            .collaboration-container {
                position: fixed;
                bottom: 140px;
                right: 20px;
                z-index: 9997;
                font-family: 'Inter', sans-serif;
            }

            .collab-toggle {
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
                transition: transform 0.3s ease;
                position: relative;
            }

            .collab-toggle:hover {
                transform: scale(1.1);
            }

            .collab-toggle i {
                font-size: 20px;
                color: white;
            }

            .collab-notification {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #EF4444;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
            }

            .collab-panel {
                position: absolute;
                bottom: 60px;
                right: 0;
                width: 450px;
                height: 600px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
            }

            .collab-header {
                background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                color: white;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .collab-header h3 {
                margin: 0;
                font-size: 1.2rem;
                font-weight: 600;
            }

            .collab-status {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 12px;
            }

            .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #22C55E;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .collab-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
            }

            .collab-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .collab-tabs {
                display: flex;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
            }

            .collab-tab {
                flex: 1;
                padding: 10px 5px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.3s ease;
                color: #6c757d;
            }

            .collab-tab.active {
                background: white;
                color: #495057;
                border-bottom: 2px solid #10B981;
            }

            .collab-content {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
            }

            .collab-tab-content {
                display: none;
            }

            .collab-tab-content.active {
                display: block;
            }

            .workspace-header, .knowledge-header, .forum-header, .files-header {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                align-items: center;
            }

            .workspace-header input, .knowledge-header input, .forum-header input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                font-size: 12px;
            }

            .collab-btn {
                padding: 8px 12px;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .collab-btn:hover {
                background: #f8f9fa;
                transform: translateY(-1px);
            }

            .collab-btn.primary {
                background: #10B981;
                color: white;
                border-color: #10B981;
            }

            .collab-btn.primary:hover {
                background: #059669;
            }

            .workspace-list, .knowledge-list, .discussion-list, .file-list {
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 15px;
            }

            .workspace-item, .knowledge-item, .discussion-item, .file-item {
                padding: 10px;
                border: 1px solid #e9ecef;
                border-radius: 6px;
                margin-bottom: 8px;
                background: white;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .workspace-item:hover, .knowledge-item:hover, .discussion-item:hover, .file-item:hover {
                background: #f8f9fa;
                border-color: #10B981;
            }

            .item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }

            .item-title {
                font-weight: 600;
                font-size: 13px;
                color: #495057;
            }

            .item-meta {
                font-size: 11px;
                color: #6c757d;
            }

            .item-description {
                font-size: 12px;
                color: #6c757d;
                line-height: 1.4;
            }

            .knowledge-categories, .forum-categories {
                display: flex;
                gap: 5px;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }

            .category-btn {
                padding: 5px 10px;
                border: 1px solid #dee2e6;
                border-radius: 15px;
                background: white;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.3s ease;
            }

            .category-btn.active {
                background: #10B981;
                color: white;
                border-color: #10B981;
            }

            .active-collaborators h4 {
                font-size: 14px;
                margin-bottom: 10px;
                color: #495057;
            }

            .collaborator-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .collaborator-item {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 5px 8px;
                background: #f8f9fa;
                border-radius: 15px;
                font-size: 11px;
            }

            .collaborator-avatar {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: linear-gradient(135deg, #10B981, #059669);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 8px;
                font-weight: bold;
            }

            .breadcrumb {
                display: flex;
                gap: 5px;
                margin-bottom: 10px;
                font-size: 12px;
            }

            .breadcrumb-item {
                color: #6c757d;
                cursor: pointer;
            }

            .breadcrumb-item.active {
                color: #10B981;
                font-weight: 600;
            }

            .file-item {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .file-icon {
                width: 30px;
                height: 30px;
                background: #f8f9fa;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                color: #6c757d;
            }

            .file-info {
                flex: 1;
            }

            .file-name {
                font-weight: 600;
                font-size: 12px;
                color: #495057;
            }

            .file-meta {
                font-size: 10px;
                color: #6c757d;
            }

            @media (max-width: 768px) {
                .collab-panel {
                    width: 350px;
                    height: 500px;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    setupCollaborationEventListeners() {
        const toggle = document.getElementById('collab-toggle');
        const panel = document.getElementById('collab-panel');
        const close = document.getElementById('collab-close');

        toggle.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
            this.updateCollaborationData();
        });

        close.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        // Tab switching
        document.querySelectorAll('.collab-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchCollabTab(tabId);
            });
        });

        // Workspace actions
        document.getElementById('create-workspace').addEventListener('click', () => this.createWorkspace());
        document.getElementById('workspace-search').addEventListener('input', (e) => this.searchWorkspaces(e.target.value));

        // Knowledge base actions
        document.getElementById('add-knowledge').addEventListener('click', () => this.addKnowledgeItem());
        document.getElementById('knowledge-search').addEventListener('input', (e) => this.searchKnowledge(e.target.value));

        // Forum actions
        document.getElementById('new-discussion').addEventListener('click', () => this.createDiscussion());
        document.getElementById('forum-search').addEventListener('input', (e) => this.searchForum(e.target.value));

        // File actions
        document.getElementById('upload-file').addEventListener('click', () => document.getElementById('file-upload').click());
        document.getElementById('file-upload').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('create-folder').addEventListener('click', () => this.createFolder());

        // Category filters
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                this.filterByCategory(e.target);
            }
        });
    }

    switchCollabTab(tabId) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.collab-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.collab-tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');

        // Load content for the active tab
        this.loadTabContent(tabId);
    }

    loadTabContent(tabId) {
        switch (tabId) {
            case 'workspace':
                this.loadWorkspaces();
                this.loadCollaborators();
                break;
            case 'knowledge':
                this.loadKnowledgeBase();
                break;
            case 'forum':
                this.loadForumDiscussions();
                break;
            case 'files':
                this.loadFileExplorer();
                break;
        }
    }

    setupRealTimeFeatures() {
        // Simulate real-time collaboration
        this.simulateCollaborators();
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateOnlineStatus();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateOnlineStatus();
        });
    }

    simulateCollaborators() {
        const collaborators = [
            { id: 1, name: 'Ana García', status: 'online', avatar: 'AG' },
            { id: 2, name: 'Carlos López', status: 'online', avatar: 'CL' },
            { id: 3, name: 'María González', status: 'away', avatar: 'MG' },
            { id: 4, name: 'David Ruiz', status: 'online', avatar: 'DR' }
        ];

        collaborators.forEach(collab => {
            this.collaborators.set(collab.id, collab);
        });

        // Simulate status changes
        setInterval(() => {
            collaborators.forEach(collab => {
                if (Math.random() < 0.1) { // 10% chance to change status
                    const statuses = ['online', 'away', 'busy'];
                    collab.status = statuses[Math.floor(Math.random() * statuses.length)];
                    this.collaborators.set(collab.id, collab);
                    this.loadCollaborators();
                }
            });
        }, 30000); // Every 30 seconds
    }

    setupKnowledgeBase() {
        const knowledgeItems = [
            {
                id: 1,
                title: 'Guía de Visualización de Datos con D3.js',
                description: 'Tutorial completo para crear visualizaciones interactivas',
                category: 'tutorials',
                author: 'Ana García',
                date: '2025-01-15',
                tags: ['d3js', 'visualización', 'javascript'],
                content: 'Contenido del tutorial...'
            },
            {
                id: 2,
                title: 'Mejores Prácticas en Machine Learning',
                description: 'Principios fundamentales para proyectos exitosos de ML',
                category: 'best-practices',
                author: 'Carlos López',
                date: '2025-01-14',
                tags: ['machine-learning', 'buenas-prácticas', 'datos'],
                content: 'Contenido de las mejores prácticas...'
            },
            {
                id: 3,
                title: 'Herramientas de BI Recomendadas',
                description: 'Lista curada de herramientas de Business Intelligence',
                category: 'tools',
                author: 'María González',
                date: '2025-01-13',
                tags: ['bi', 'herramientas', 'análisis'],
                content: 'Lista de herramientas recomendadas...'
            }
        ];

        knowledgeItems.forEach(item => {
            this.knowledgeBase.set(item.id, item);
        });
    }

    setupCommunityForum() {
        const discussions = [
            {
                id: 1,
                title: '¿Cómo optimizar consultas SQL complejas?',
                description: 'Necesito ayuda para mejorar el rendimiento de mis consultas',
                category: 'help',
                author: 'Juan Pérez',
                date: '2025-01-15',
                replies: 5,
                lastActivity: '2025-01-15T10:30:00Z',
                tags: ['sql', 'optimización', 'rendimiento']
            },
            {
                id: 2,
                title: 'Proyecto: Dashboard de Ventas en Tiempo Real',
                description: 'Compartiendo mi experiencia creando un dashboard con React y WebSockets',
                category: 'showcase',
                author: 'Laura Martín',
                date: '2025-01-14',
                replies: 12,
                lastActivity: '2025-01-15T09:15:00Z',
                tags: ['react', 'websockets', 'dashboard']
            },
            {
                id: 3,
                title: 'Discusión: ¿Python o R para análisis de datos?',
                description: 'Debate sobre las ventajas de cada herramienta',
                category: 'general',
                author: 'Roberto Silva',
                date: '2025-01-13',
                replies: 23,
                lastActivity: '2025-01-15T08:45:00Z',
                tags: ['python', 'r', 'análisis-datos']
            }
        ];

        discussions.forEach(discussion => {
            this.discussions.set(discussion.id, discussion);
        });
    }

    setupFileSharing() {
        this.fileSystem = {
            currentPath: '/',
            files: new Map(),
            folders: new Map()
        };

        // Sample files and folders
        const sampleFiles = [
            {
                id: 1,
                name: 'Propuesta_Proyecto_BI.pdf',
                type: 'pdf',
                size: 2.5 * 1024 * 1024, // 2.5MB
                path: '/',
                owner: 'Ana García',
                modified: '2025-01-15T10:00:00Z'
            },
            {
                id: 2,
                name: 'Datos_Ventas_2024.xlsx',
                type: 'xlsx',
                size: 1.2 * 1024 * 1024, // 1.2MB
                path: '/Datos/',
                owner: 'Carlos López',
                modified: '2025-01-14T15:30:00Z'
            },
            {
                id: 3,
                name: 'Dashboard_Mockup.png',
                type: 'png',
                size: 850 * 1024, // 850KB
                path: '/Diseños/',
                owner: 'María González',
                modified: '2025-01-13T12:45:00Z'
            }
        ];

        const sampleFolders = [
            { name: 'Datos', path: '/', created: '2025-01-10' },
            { name: 'Diseños', path: '/', created: '2025-01-10' },
            { name: 'Documentación', path: '/', created: '2025-01-10' }
        ];

        sampleFiles.forEach(file => {
            this.fileSystem.files.set(file.id, file);
        });

        sampleFolders.forEach(folder => {
            this.fileSystem.folders.set(folder.name, folder);
        });
    }

    setupNotificationSystem() {
        // Simulate notifications
        const sampleNotifications = [
            {
                id: 1,
                type: 'mention',
                title: 'Te mencionaron en una discusión',
                message: 'Ana García te mencionó en "Optimización de consultas SQL"',
                timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
                read: false
            },
            {
                id: 2,
                type: 'file',
                title: 'Archivo compartido contigo',
                message: 'Carlos López compartió "Datos_Ventas_2024.xlsx"',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                read: false
            }
        ];

        this.notifications = sampleNotifications;
        this.updateNotificationCount();
    }

    setupOnlineStatus() {
        this.updateOnlineStatus();
        
        // Update online count periodically
        setInterval(() => {
            const onlineCount = Array.from(this.collaborators.values())
                .filter(collab => collab.status === 'online').length;
            document.getElementById('online-count').textContent = `${onlineCount} en línea`;
        }, 5000);
    }

    updateOnlineStatus() {
        const statusIndicator = document.getElementById('online-status');
        if (statusIndicator) {
            statusIndicator.style.background = this.isOnline ? '#22C55E' : '#EF4444';
        }
    }

    updateCollaborationData() {
        if (document.getElementById('collab-panel').style.display !== 'none') {
            this.loadTabContent('workspace'); // Default tab
        }
    }

    loadWorkspaces() {
        const workspaceList = document.getElementById('workspace-list');
        
        // Sample workspaces
        const workspaces = [
            {
                id: 1,
                name: 'Proyecto Dashboard Analytics',
                description: 'Desarrollo de dashboard para análisis de ventas',
                members: 4,
                lastActivity: '2025-01-15T10:30:00Z',
                status: 'active'
            },
            {
                id: 2,
                name: 'Migración Base de Datos',
                description: 'Migración de PostgreSQL a MySQL',
                members: 2,
                lastActivity: '2025-01-14T16:20:00Z',
                status: 'active'
            }
        ];

        workspaceList.innerHTML = workspaces.map(workspace => `
            <div class="workspace-item" onclick="window.collaborationPlatform.openWorkspace(${workspace.id})">
                <div class="item-header">
                    <div class="item-title">${workspace.name}</div>
                    <div class="item-meta">${workspace.members} miembros</div>
                </div>
                <div class="item-description">${workspace.description}</div>
                <div class="item-meta">Última actividad: ${this.formatDate(workspace.lastActivity)}</div>
            </div>
        `).join('');
    }

    loadCollaborators() {
        const collaboratorList = document.getElementById('collaborator-list');
        
        collaboratorList.innerHTML = Array.from(this.collaborators.values())
            .filter(collab => collab.status === 'online')
            .map(collab => `
                <div class="collaborator-item">
                    <div class="collaborator-avatar">${collab.avatar}</div>
                    <span>${collab.name}</span>
                </div>
            `).join('');
    }

    loadKnowledgeBase() {
        const knowledgeList = document.getElementById('knowledge-list');
        
        knowledgeList.innerHTML = Array.from(this.knowledgeBase.values()).map(item => `
            <div class="knowledge-item" onclick="window.collaborationPlatform.openKnowledgeItem(${item.id})">
                <div class="item-header">
                    <div class="item-title">${item.title}</div>
                    <div class="item-meta">${item.category}</div>
                </div>
                <div class="item-description">${item.description}</div>
                <div class="item-meta">Por ${item.author} - ${this.formatDate(item.date)}</div>
            </div>
        `).join('');
    }

    loadForumDiscussions() {
        const discussionList = document.getElementById('discussion-list');
        
        discussionList.innerHTML = Array.from(this.discussions.values()).map(discussion => `
            <div class="discussion-item" onclick="window.collaborationPlatform.openDiscussion(${discussion.id})">
                <div class="item-header">
                    <div class="item-title">${discussion.title}</div>
                    <div class="item-meta">${discussion.replies} respuestas</div>
                </div>
                <div class="item-description">${discussion.description}</div>
                <div class="item-meta">Por ${discussion.author} - ${this.formatDate(discussion.date)}</div>
            </div>
        `).join('');
    }

    loadFileExplorer() {
        const fileList = document.getElementById('file-list');
        const currentPath = this.fileSystem.currentPath;
        
        // Show folders first
        const folders = Array.from(this.fileSystem.folders.values())
            .filter(folder => folder.path === currentPath);
        
        const files = Array.from(this.fileSystem.files.values())
            .filter(file => file.path === currentPath);
        
        fileList.innerHTML = [
            ...folders.map(folder => `
                <div class="file-item" onclick="window.collaborationPlatform.openFolder('${folder.name}')">
                    <div class="file-icon"><i class="bi bi-folder"></i></div>
                    <div class="file-info">
                        <div class="file-name">${folder.name}</div>
                        <div class="file-meta">Carpeta - Creada ${this.formatDate(folder.created)}</div>
                    </div>
                </div>
            `),
            ...files.map(file => `
                <div class="file-item" onclick="window.collaborationPlatform.openFile(${file.id})">
                    <div class="file-icon"><i class="bi bi-file-earmark-${this.getFileIcon(file.type)}"></i></div>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${this.formatFileSize(file.size)} - ${file.owner} - ${this.formatDate(file.modified)}</div>
                    </div>
                </div>
            `)
        ].join('');
    }

    createWorkspace() {
        const name = prompt('Nombre del workspace:');
        if (!name) return;
        
        const description = prompt('Descripción del workspace:');
        if (!description) return;
        
        const newWorkspace = {
            id: Date.now(),
            name: name,
            description: description,
            members: 1,
            lastActivity: new Date().toISOString(),
            status: 'active'
        };
        
        this.workspaces.set(newWorkspace.id, newWorkspace);
        this.loadWorkspaces();
        this.showNotification('Workspace creado exitosamente');
    }

    addKnowledgeItem() {
        const title = prompt('Título del artículo:');
        if (!title) return;
        
        const description = prompt('Descripción breve:');
        if (!description) return;
        
        const category = prompt('Categoría (tutorials/best-practices/tools/resources):') || 'tutorials';
        
        const newItem = {
            id: Date.now(),
            title: title,
            description: description,
            category: category,
            author: this.userProfile.name || 'Usuario Anónimo',
            date: new Date().toISOString(),
            tags: [],
            content: 'Contenido del artículo...'
        };
        
        this.knowledgeBase.set(newItem.id, newItem);
        this.loadKnowledgeBase();
        this.showNotification('Artículo agregado a la base de conocimiento');
    }

    createDiscussion() {
        const title = prompt('Título de la discusión:');
        if (!title) return;
        
        const description = prompt('Descripción inicial:');
        if (!description) return;
        
        const category = prompt('Categoría (general/help/projects/showcase):') || 'general';
        
        const newDiscussion = {
            id: Date.now(),
            title: title,
            description: description,
            category: category,
            author: this.userProfile.name || 'Usuario Anónimo',
            date: new Date().toISOString(),
            replies: 0,
            lastActivity: new Date().toISOString(),
            tags: []
        };
        
        this.discussions.set(newDiscussion.id, newDiscussion);
        this.loadForumDiscussions();
        this.showNotification('Discusión creada exitosamente');
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            if (file.size > this.config.maxFileSize) {
                this.showNotification(`El archivo ${file.name} es demasiado grande`, 'error');
                return;
            }
            
            const extension = file.name.split('.').pop().toLowerCase();
            if (!this.config.allowedFileTypes.includes(extension)) {
                this.showNotification(`Tipo de archivo ${extension} no permitido`, 'error');
                return;
            }
            
            const newFile = {
                id: Date.now() + Math.random(),
                name: file.name,
                type: extension,
                size: file.size,
                path: this.fileSystem.currentPath,
                owner: this.userProfile.name || 'Usuario Anónimo',
                modified: new Date().toISOString()
            };
            
            this.fileSystem.files.set(newFile.id, newFile);
            this.showNotification(`Archivo ${file.name} subido exitosamente`);
        });
        
        this.loadFileExplorer();
        event.target.value = ''; // Clear file input
    }

    createFolder() {
        const name = prompt('Nombre de la carpeta:');
        if (!name) return;
        
        const newFolder = {
            name: name,
            path: this.fileSystem.currentPath,
            created: new Date().toISOString()
        };
        
        this.fileSystem.folders.set(name, newFolder);
        this.loadFileExplorer();
        this.showNotification(`Carpeta ${name} creada exitosamente`);
    }

    openWorkspace(id) {
        this.showNotification(`Abriendo workspace ${id}`);
    }

    openKnowledgeItem(id) {
        const item = this.knowledgeBase.get(id);
        if (item) {
            this.showNotification(`Abriendo: ${item.title}`);
        }
    }

    openDiscussion(id) {
        const discussion = this.discussions.get(id);
        if (discussion) {
            this.showNotification(`Abriendo discusión: ${discussion.title}`);
        }
    }

    openFile(id) {
        const file = this.fileSystem.files.get(id);
        if (file) {
            this.showNotification(`Abriendo archivo: ${file.name}`);
        }
    }

    openFolder(name) {
        this.fileSystem.currentPath = this.fileSystem.currentPath + name + '/';
        this.updateBreadcrumb();
        this.loadFileExplorer();
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('file-breadcrumb');
        const pathParts = this.fileSystem.currentPath.split('/').filter(part => part);
        
        breadcrumb.innerHTML = `
            <span class="breadcrumb-item ${pathParts.length === 0 ? 'active' : ''}" 
                  onclick="window.collaborationPlatform.navigateToPath('/')">Inicio</span>
            ${pathParts.map((part, index) => {
                const path = '/' + pathParts.slice(0, index + 1).join('/') + '/';
                const isActive = index === pathParts.length - 1;
                return `<span class="breadcrumb-item ${isActive ? 'active' : ''}"
                             onclick="window.collaborationPlatform.navigateToPath('${path}')">${part}</span>`;
            }).join(' / ')}
        `;
    }

    navigateToPath(path) {
        this.fileSystem.currentPath = path;
        this.updateBreadcrumb();
        this.loadFileExplorer();
    }

    searchWorkspaces(query) {
        // Implement workspace search
        console.log('Searching workspaces:', query);
    }

    searchKnowledge(query) {
        // Implement knowledge base search
        console.log('Searching knowledge base:', query);
    }

    searchForum(query) {
        // Implement forum search
        console.log('Searching forum:', query);
    }

    filterByCategory(button) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const category = button.dataset.category;
        console.log('Filtering by category:', category);
        
        // Implement category filtering based on current tab
    }

    loadUserProfile() {
        return JSON.parse(localStorage.getItem('user_profile') || '{}');
    }

    saveUserProfile(profile) {
        localStorage.setItem('user_profile', JSON.stringify(profile));
        this.userProfile = profile;
    }

    showNotification(message, type = 'info') {
        const notification = {
            id: Date.now(),
            message: message,
            type: type,
            timestamp: new Date()
        };
        
        this.notifications.unshift(notification);
        this.updateNotificationCount();
        
        // Show toast notification
        this.showToast(message, type);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            this.notifications = this.notifications.filter(n => n.id !== notification.id);
            this.updateNotificationCount();
        }, 5000);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#EF4444' : '#10B981'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 99999;
            animation: slideInFromRight 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutToRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    updateNotificationCount() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('collab-notification');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return date.toLocaleDateString('es-ES');
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    getFileIcon(type) {
        const iconMap = {
            'pdf': 'pdf',
            'doc': 'word',
            'docx': 'word',
            'xls': 'excel',
            'xlsx': 'excel',
            'ppt': 'ppt',
            'pptx': 'ppt',
            'txt': 'text',
            'csv': 'table',
            'png': 'image',
            'jpg': 'image',
            'jpeg': 'image',
            'gif': 'image'
        };
        
        return iconMap[type] || 'earmark';
    }
}

// Initialize Collaboration Platform when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.collaborationPlatform = new CollaborationPlatform();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollaborationPlatform;
}