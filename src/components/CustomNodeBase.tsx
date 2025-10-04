// Base custom node component with standardized input/output positioning
import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface CustomNodeBaseProps {
  children?: React.ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
  className?: string;
  nodeType?: string;
  [key: string]: any; // Allow additional props to be spread
}

const CustomNodeBase: React.FC<CustomNodeBaseProps> = ({
  children,
  hasInput = false,
  hasOutput = false,
  className = '',
  nodeType = 'default',
  ...props
}) => {
  return (
    <div
      className={`custom-node ${nodeType}-node ${className}`}
      {...props}
    >
      {/* Input handle on the left side */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="custom-handle input-handle"
        />
      )}

      {/* Node content */}
      <div className="node-content">
        {children}
      </div>

      {/* Output handle on the right side */}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="custom-handle output-handle"
        />
      )}
    </div>
  );
};

export default CustomNodeBase;
