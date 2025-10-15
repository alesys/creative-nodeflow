/**
 * Flow Storage Service using LocalStorage
 * Implements storage with namespace support for future multi-tenancy
 */

import type { SavedFlow, FlowTemplate, FlowStorageService, FlowListOptions, TemplateListOptions } from '../types/flow';
import logger from '../utils/logger';

// Storage keys with namespacing
const STORAGE_KEYS = {
  FLOWS: 'creative_nodeflow_flows',
  TEMPLATES: 'creative_nodeflow_templates',
  CURRENT_FLOW_ID: 'creative_nodeflow_current_flow_id',
  USER_NAMESPACE: 'creative_nodeflow_user', // For future multi-tenancy
  ORG_NAMESPACE: 'creative_nodeflow_org'    // For future multi-tenancy
};

class LocalFlowStorageService implements FlowStorageService {
  // For future multi-tenancy - currently unused but reserved for future use
  // @ts-ignore - Reserved for future implementation
  private currentUserId: string | null = null;
  // @ts-ignore - Reserved for future implementation
  private currentOrgId: string | null = null;
  
  /**
   * Set current user context (for future multi-tenancy)
   */
  setUserContext(userId: string | null, orgId: string | null = null): void {
    this.currentUserId = userId;
    this.currentOrgId = orgId;
    logger.debug('User context set:', { userId, orgId });
  }
  
  /**
   * Get storage key with namespace
   */
  private getStorageKey(baseKey: string): string {
    // For now, use base key. In the future, append user/org namespace
    // Example: `${baseKey}_${this.currentUserId}_${this.currentOrgId}`
    return baseKey;
  }
  
  // ============================================================================
  // Flow Operations
  // ============================================================================
  
  async saveFlow(flow: SavedFlow): Promise<void> {
    try {
      const flows = await this.listFlows();
      const existingIndex = flows.findIndex(f => f.metadata.id === flow.metadata.id);
      
      if (existingIndex >= 0) {
        // Update existing flow
        flows[existingIndex] = flow;
        logger.debug('Flow updated:', flow.metadata.id);
      } else {
        // Add new flow
        flows.push(flow);
        logger.debug('Flow saved:', flow.metadata.id);
      }
      
      this.saveFlowsToStorage(flows);
      
      // Set as current flow
      this.setCurrentFlowId(flow.metadata.id);
    } catch (error) {
      logger.error('Failed to save flow:', error);
      throw new Error('Failed to save flow to storage');
    }
  }
  
  async loadFlow(id: string): Promise<SavedFlow | null> {
    try {
      const flows = await this.listFlows();
      const flow = flows.find(f => f.metadata.id === id);
      
      if (flow) {
        logger.debug('Flow loaded:', id);
        this.setCurrentFlowId(id);
      } else {
        logger.warn('Flow not found:', id);
      }
      
      return flow || null;
    } catch (error) {
      logger.error('Failed to load flow:', error);
      return null;
    }
  }
  
  async deleteFlow(id: string): Promise<void> {
    try {
      const flows = await this.listFlows();
      const filteredFlows = flows.filter(f => f.metadata.id !== id);
      
      this.saveFlowsToStorage(filteredFlows);
      
      // Clear current flow ID if it was deleted
      if (this.getCurrentFlowId() === id) {
        this.clearCurrentFlowId();
      }
      
      logger.debug('Flow deleted:', id);
    } catch (error) {
      logger.error('Failed to delete flow:', error);
      throw new Error('Failed to delete flow');
    }
  }
  
  async listFlows(options?: FlowListOptions): Promise<SavedFlow[]> {
    try {
      const key = this.getStorageKey(STORAGE_KEYS.FLOWS);
      const data = localStorage.getItem(key);
      
      if (!data) {
        return [];
      }
      
      let flows: SavedFlow[] = JSON.parse(data);
      
      // Filter by user/org if specified
      if (options?.userId) {
        flows = flows.filter(f => f.metadata.owner?.userId === options.userId);
      }
      
      if (options?.orgId) {
        flows = flows.filter(f => f.metadata.organization?.orgId === options.orgId);
      }
      
      // Filter by tags
      if (options?.tags && options.tags.length > 0) {
        flows = flows.filter(f => 
          f.metadata.tags?.some(tag => options.tags!.includes(tag))
        );
      }
      
      // Search query
      if (options?.searchQuery) {
        const query = options.searchQuery.toLowerCase();
        flows = flows.filter(f => 
          f.metadata.name.toLowerCase().includes(query) ||
          f.metadata.description?.toLowerCase().includes(query)
        );
      }
      
      // Sort
      if (options?.sortBy) {
        flows.sort((a, b) => {
          let aVal: any, bVal: any;
          
          switch (options.sortBy) {
            case 'name':
              aVal = a.metadata.name.toLowerCase();
              bVal = b.metadata.name.toLowerCase();
              break;
            case 'createdAt':
              aVal = new Date(a.metadata.createdAt).getTime();
              bVal = new Date(b.metadata.createdAt).getTime();
              break;
            case 'updatedAt':
              aVal = new Date(a.metadata.updatedAt).getTime();
              bVal = new Date(b.metadata.updatedAt).getTime();
              break;
            default:
              return 0;
          }
          
          const order = options.sortOrder === 'desc' ? -1 : 1;
          return aVal < bVal ? -order : aVal > bVal ? order : 0;
        });
      }
      
      // Pagination
      if (options?.limit !== undefined || options?.offset !== undefined) {
        const offset = options.offset || 0;
        const limit = options.limit || flows.length;
        flows = flows.slice(offset, offset + limit);
      }
      
      return flows;
    } catch (error) {
      logger.error('Failed to list flows:', error);
      return [];
    }
  }
  
  // ============================================================================
  // Template Operations
  // ============================================================================
  
  async saveTemplate(template: FlowTemplate): Promise<void> {
    try {
      const templates = await this.listTemplates();
      const existingIndex = templates.findIndex(t => t.metadata.id === template.metadata.id);
      
      if (existingIndex >= 0) {
        // Update existing template
        templates[existingIndex] = template;
        logger.debug('Template updated:', template.metadata.id);
      } else {
        // Add new template
        templates.push(template);
        logger.debug('Template saved:', template.metadata.id);
      }
      
      this.saveTemplatesToStorage(templates);
    } catch (error) {
      logger.error('Failed to save template:', error);
      throw new Error('Failed to save template to storage');
    }
  }
  
  async loadTemplate(id: string): Promise<FlowTemplate | null> {
    try {
      const templates = await this.listTemplates();
      const template = templates.find(t => t.metadata.id === id);
      
      if (template) {
        logger.debug('Template loaded:', id);
        
        // Increment usage count
        template.usageCount = (template.usageCount || 0) + 1;
        await this.saveTemplate(template);
      } else {
        logger.warn('Template not found:', id);
      }
      
      return template || null;
    } catch (error) {
      logger.error('Failed to load template:', error);
      return null;
    }
  }
  
  async deleteTemplate(id: string): Promise<void> {
    try {
      const templates = await this.listTemplates();
      const filteredTemplates = templates.filter(t => t.metadata.id !== id);
      
      this.saveTemplatesToStorage(filteredTemplates);
      logger.debug('Template deleted:', id);
    } catch (error) {
      logger.error('Failed to delete template:', error);
      throw new Error('Failed to delete template');
    }
  }
  
  async listTemplates(options?: TemplateListOptions): Promise<FlowTemplate[]> {
    try {
      const key = this.getStorageKey(STORAGE_KEYS.TEMPLATES);
      const data = localStorage.getItem(key);
      
      if (!data) {
        return [];
      }
      
      let templates: FlowTemplate[] = JSON.parse(data);
      
      // Apply same filters as flows
      if (options?.userId) {
        templates = templates.filter(t => t.metadata.owner?.userId === options.userId);
      }
      
      if (options?.orgId) {
        templates = templates.filter(t => t.metadata.organization?.orgId === options.orgId);
      }
      
      if (options?.tags && options.tags.length > 0) {
        templates = templates.filter(t => 
          t.metadata.tags?.some(tag => options.tags!.includes(tag))
        );
      }
      
      // Category filter (template-specific)
      if (options?.category) {
        templates = templates.filter(t => t.category === options.category);
      }
      
      // Search query
      if (options?.searchQuery) {
        const query = options.searchQuery.toLowerCase();
        templates = templates.filter(t => 
          t.metadata.name.toLowerCase().includes(query) ||
          t.metadata.description?.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query)
        );
      }
      
      // Sort
      if (options?.sortBy) {
        templates.sort((a, b) => {
          let aVal: any, bVal: any;
          
          switch (options.sortBy) {
            case 'name':
              aVal = a.metadata.name.toLowerCase();
              bVal = b.metadata.name.toLowerCase();
              break;
            case 'createdAt':
              aVal = new Date(a.metadata.createdAt).getTime();
              bVal = new Date(b.metadata.createdAt).getTime();
              break;
            case 'updatedAt':
              aVal = new Date(a.metadata.updatedAt).getTime();
              bVal = new Date(b.metadata.updatedAt).getTime();
              break;
            default:
              return 0;
          }
          
          const order = options.sortOrder === 'desc' ? -1 : 1;
          return aVal < bVal ? -order : aVal > bVal ? order : 0;
        });
      }
      
      // Pagination
      if (options?.limit !== undefined || options?.offset !== undefined) {
        const offset = options.offset || 0;
        const limit = options.limit || templates.length;
        templates = templates.slice(offset, offset + limit);
      }
      
      return templates;
    } catch (error) {
      logger.error('Failed to list templates:', error);
      return [];
    }
  }
  
  // ============================================================================
  // Current Flow Tracking
  // ============================================================================
  
  getCurrentFlowId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_FLOW_ID);
  }
  
  setCurrentFlowId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_FLOW_ID, id);
  }
  
  clearCurrentFlowId(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_FLOW_ID);
  }
  
  // ============================================================================
  // Private Helpers
  // ============================================================================
  
  private saveFlowsToStorage(flows: SavedFlow[]): void {
    const key = this.getStorageKey(STORAGE_KEYS.FLOWS);
    localStorage.setItem(key, JSON.stringify(flows));
  }
  
  private saveTemplatesToStorage(templates: FlowTemplate[]): void {
    const key = this.getStorageKey(STORAGE_KEYS.TEMPLATES);
    localStorage.setItem(key, JSON.stringify(templates));
  }
  
  // ============================================================================
  // Utility Methods
  // ============================================================================
  
  /**
   * Clear all flows and templates (for testing/reset)
   */
  async clearAll(): Promise<void> {
    localStorage.removeItem(this.getStorageKey(STORAGE_KEYS.FLOWS));
    localStorage.removeItem(this.getStorageKey(STORAGE_KEYS.TEMPLATES));
    localStorage.removeItem(STORAGE_KEYS.CURRENT_FLOW_ID);
    logger.debug('All flows and templates cleared');
  }
  
  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    flowCount: number;
    templateCount: number;
    storageUsed: number;
  }> {
    const flows = await this.listFlows();
    const templates = await this.listTemplates();
    
    // Estimate storage used
    const flowsData = localStorage.getItem(this.getStorageKey(STORAGE_KEYS.FLOWS)) || '';
    const templatesData = localStorage.getItem(this.getStorageKey(STORAGE_KEYS.TEMPLATES)) || '';
    const storageUsed = flowsData.length + templatesData.length;
    
    return {
      flowCount: flows.length,
      templateCount: templates.length,
      storageUsed
    };
  }
}

const localFlowStorageService = new LocalFlowStorageService();
export default localFlowStorageService;
