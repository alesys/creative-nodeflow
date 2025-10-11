/**
 * NodeBody Component
 * Container for node content with optional sections
 */

import React, { useState } from 'react';
import type { NodeBodySection } from '../../types/nodeConfig';

interface NodeBodyProps {
  sections?: NodeBodySection[];
  children?: React.ReactNode;
}

export const NodeBody: React.FC<NodeBodyProps> = ({ sections, children }) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };
  
  if (!sections && children) {
    return <div className="node-body">{children}</div>;
  }
  
  return (
    <div className="node-body">
      {sections?.map(section => {
        const isCollapsed = section.collapsible && collapsedSections.has(section.id);
        
        return (
          <div key={section.id} className="node-body-section">
            {section.label && (
              <div 
                className="section-header"
                onClick={() => section.collapsible && toggleSection(section.id)}
                style={{ cursor: section.collapsible ? 'pointer' : 'default' }}
              >
                <span className="section-label">{section.label}</span>
                {section.collapsible && (
                  <span className="section-toggle">
                    {isCollapsed ? '▼' : '▲'}
                  </span>
                )}
              </div>
            )}
            {!isCollapsed && (
              <div className="section-content">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
      {children}
    </div>
  );
};
