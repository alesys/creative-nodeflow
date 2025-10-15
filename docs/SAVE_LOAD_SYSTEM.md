# Save/Load Flow System Documentation

## Overview

The Creative NodeFlow application now includes a comprehensive save/load system that allows users to save their work, create reusable templates, and manage multiple flows. The system is designed with future multi-tenancy in mind, making it easy to add user authentication and organization support later.

## Features

### 1. Save Flow
- Save complete flow state including nodes, edges, and viewport
- Add metadata: name, description, and tags
- Auto-save current flow ID for easy updates
- Visual indicator in toolbar showing current flow name

### 2. Load Flow
- Browse all saved flows with search functionality
- View flow details (name, description, tags, last updated)
- Load flow to restore complete state
- Delete flows with confirmation

### 3. Templates
- Save flows as reusable templates
- Organize templates by category (Content Creation, Image Generation, Video Production, etc.)
- Track template usage count
- Instantiate templates as new flows (with new IDs)

### 4. UI Components

#### Toolbar Buttons (Top Center)
- **New**: Start a new empty flow (with confirmation if current flow has changes)
- **Save**: Open save dialog to save current flow or template
- **Load**: Open load dialog to browse flows and templates
- **Current Flow Indicator**: Shows name of currently loaded flow

#### Save Dialog
- Flow name (required)
- Description (optional)
- Tags (add multiple, press Enter to add)
- "Save as Template" checkbox
- Template category selector (when saving as template)

#### Load Dialog
- Two tabs: "Flows" and "Templates"
- Search bar (searches name, description, and tags)
- List view with:
  - Flow/template name
  - Description
  - Tags (as chips)
  - Last updated timestamp
  - Template category (for templates)
  - Usage count (for templates)
  - Delete button
- Click to load

## Architecture

### Type System (`src/types/flow.ts`)

#### Core Types
```typescript
- FlowMetadata: Metadata for flows/templates
- FlowState: Serializable ReactFlow state (nodes, edges, viewport)
- SavedFlow: Complete flow with metadata and state
- FlowTemplate: Extended SavedFlow with template-specific fields
```

#### Future Multi-Tenancy Support
```typescript
- FlowUser: User identification (userId, username, email)
- FlowOrganization: Organization/workspace (orgId, orgName)
- FlowPermission: 'private' | 'org-shared' | 'public'
```

All flow metadata includes optional `owner`, `organization`, and `permission` fields that are ready for future authentication/authorization implementation.

### Services

#### FlowSerializationService (`src/services/FlowSerializationService.ts`)
Handles serialization and deserialization of ReactFlow state:
- `serializeFlow()`: Convert ReactFlow state to SavedFlow
- `serializeTemplate()`: Create template from flow
- `deserializeFlow()`: Restore ReactFlow state from SavedFlow
- `instantiateTemplate()`: Create new flow from template
- `validateFlow()`: Validate flow structure
- `exportToJSON()` / `importFromJSON()`: JSON export/import

**Key Features:**
- Sanitizes node data (removes non-serializable callbacks)
- Regenerates node IDs when instantiating templates (prevents conflicts)
- Preserves viewport state
- Version tracking

#### FlowStorageService (`src/services/FlowStorageService.ts`)
Implements storage operations using localStorage:
- Flow CRUD operations (save, load, delete, list)
- Template CRUD operations
- Filtering, sorting, and search
- Namespace support for future multi-tenancy

**Key Features:**
- Implements `FlowStorageService` interface (easy to swap backends)
- Storage keys with namespace structure (`creative_nodeflow_flows`, `creative_nodeflow_templates`)
- Current flow tracking
- Filtering by user/org (ready for multi-tenancy)
- Search across name, description, tags
- Pagination support

### Components

#### SaveFlowDialog (`src/components/SaveFlowDialog.tsx`)
Material-UI dialog for saving flows:
- Name input (required)
- Description textarea
- Tag input with chips
- "Save as Template" checkbox
- Template category selector
- Themed to match app design system

#### LoadFlowDialog (`src/components/LoadFlowDialog.tsx`)
Material-UI dialog for browsing and loading:
- Tabbed interface (Flows / Templates)
- Search bar
- List with rich metadata display
- Delete confirmation
- Themed to match app design system

### Integration (`src/CreativeNodeFlow.tsx`)

**State Management:**
```typescript
- saveDialogOpen / setSaveDialogOpen
- loadDialogOpen / setLoadDialogOpen
- currentFlowId / setCurrentFlowId
- currentFlowName / setCurrentFlowName
- currentFlowDescription / setCurrentFlowDescription
- currentFlowTags / setCurrentFlowTags
```

**Handlers:**
- `handleSaveFlow()`: Serialize and save flow/template
- `handleLoadFlow()`: Deserialize and load flow
- `handleLoadTemplate()`: Instantiate and load template
- `handleNewFlow()`: Reset to empty flow

## Data Storage

### LocalStorage Keys
- `creative_nodeflow_flows`: Array of SavedFlow objects
- `creative_nodeflow_templates`: Array of FlowTemplate objects
- `creative_nodeflow_current_flow_id`: ID of currently loaded flow

### Data Structure Example
```json
{
  "metadata": {
    "id": "flow_1234567890_abc123",
    "name": "My Video Pipeline",
    "description": "Template for creating video content",
    "createdAt": "2025-10-15T19:30:00.000Z",
    "updatedAt": "2025-10-15T19:45:00.000Z",
    "version": "1.0.0",
    "appVersion": "1.0.0",
    "owner": { "userId": "user123" },
    "organization": { "orgId": "org456" },
    "permission": "private",
    "tags": ["video", "ai", "automation"]
  },
  "state": {
    "nodes": [...],
    "edges": [...],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  },
  "isTemplate": false
}
```

## Future Enhancements

### Planned for Multi-Tenancy
When adding authentication:

1. **Update FlowStorageService**
   ```typescript
   // In FlowStorageService.ts
   setUserContext(userId, orgId);
   // Uncomment namespace logic in getStorageKey()
   ```

2. **Add Backend API**
   ```typescript
   // Create new service implementing FlowStorageService
   class BackendFlowStorageService implements FlowStorageService {
     // Implement with API calls instead of localStorage
   }
   ```

3. **Add Permission Checks**
   ```typescript
   // In load/save handlers, check permissions
   if (flow.metadata.permission === 'private') {
     // Only allow owner access
   }
   ```

4. **Add Sharing UI**
   - Share dialog with permission selector
   - Collaborator management
   - Public/private toggle

### Additional Features
- **Auto-save**: Periodic auto-save with draft indicator
- **Version History**: Save flow versions, allow rollback
- **Export/Import**: Download flows as JSON files
- **Flow Thumbnails**: Capture minimap screenshot for visual preview
- **Collaboration**: Real-time multi-user editing
- **Cloud Sync**: Sync flows across devices
- **Flow Categories**: Organize flows in folders/projects

## Usage Examples

### Save Current Work
1. Click "Save" button in toolbar
2. Enter flow name and description
3. Add tags for organization
4. Click "Save Flow"

### Create Reusable Template
1. Build your flow
2. Click "Save" button
3. Check "Save as Template"
4. Select category
5. Click "Save Template"

### Load Previous Work
1. Click "Load" button
2. Search or browse flows
3. Click on flow to load

### Use Template
1. Click "Load" button
2. Switch to "Templates" tab
3. Click on template
4. Template is instantiated as new flow with unique IDs

### Start Fresh
1. Click "New" button
2. Confirm if you have unsaved changes
3. Canvas resets to initial state

## Technical Considerations

### Performance
- localStorage has ~5-10MB limit per domain
- Large flows (many nodes) may hit limits
- Consider backend storage for production

### Browser Compatibility
- localStorage supported in all modern browsers
- Data persists until explicitly cleared
- Private/Incognito mode may limit storage

### Data Migration
When moving to backend:
1. Export all flows from localStorage
2. Import to backend via API
3. Services already support interface swap

## Testing

### Manual Testing Checklist
- [ ] Save a new flow
- [ ] Load an existing flow
- [ ] Save as template
- [ ] Load template (creates new flow)
- [ ] Delete flow/template
- [ ] Search flows by name
- [ ] Filter by tags
- [ ] Start new flow (with confirmation)
- [ ] Current flow name displays correctly
- [ ] Multiple save/load cycles work
- [ ] Template categories work
- [ ] Tags display and filter correctly

### Edge Cases
- Empty flow name (should require)
- Special characters in names
- Very long descriptions
- Many tags
- Large flows (100+ nodes)
- Rapid save/load operations
- Browser storage quota exceeded

## Dependencies

- **date-fns**: Date formatting for "updated X time ago"
- **@mui/material**: UI components for dialogs
- **@xyflow/react**: ReactFlow state management

## API Reference

See inline documentation in:
- `src/types/flow.ts` - Type definitions
- `src/services/FlowSerializationService.ts` - Serialization logic
- `src/services/FlowStorageService.ts` - Storage operations
- `src/components/SaveFlowDialog.tsx` - Save UI
- `src/components/LoadFlowDialog.tsx` - Load UI
