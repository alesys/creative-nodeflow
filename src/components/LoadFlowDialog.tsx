/**
 * Load Flow Dialog Component
 * Allows users to browse and load saved flows and templates
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  InputAdornment
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import TemplateIcon from '@mui/icons-material/AccountTree';
import type { SavedFlow, FlowTemplate } from '../types/flow';
import localFlowStorageService from '../services/FlowStorageService';
import { formatDistanceToNow } from 'date-fns';

interface LoadFlowDialogProps {
  open: boolean;
  onClose: () => void;
  onLoadFlow: (flow: SavedFlow) => void;
  onLoadTemplate: (template: FlowTemplate) => void;
}

const LoadFlowDialog: React.FC<LoadFlowDialogProps> = ({
  open,
  onClose,
  onLoadFlow,
  onLoadTemplate
}) => {
  const [tabValue, setTabValue] = useState<'flows' | 'templates'>('flows');
  const [flows, setFlows] = useState<SavedFlow[]>([]);
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Load flows and templates
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedFlows, loadedTemplates] = await Promise.all([
        localFlowStorageService.listFlows({ sortBy: 'updatedAt', sortOrder: 'desc' }),
        localFlowStorageService.listTemplates({ sortBy: 'updatedAt', sortOrder: 'desc' })
      ]);
      setFlows(loadedFlows);
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Failed to load flows/templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, isTemplate: boolean) => {
    if (!window.confirm(`Are you sure you want to delete this ${isTemplate ? 'template' : 'flow'}?`)) {
      return;
    }

    try {
      if (isTemplate) {
        await localFlowStorageService.deleteTemplate(id);
      } else {
        await localFlowStorageService.deleteFlow(id);
      }
      await loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleLoad = (item: SavedFlow | FlowTemplate) => {
    if (item.isTemplate) {
      onLoadTemplate(item as FlowTemplate);
    } else {
      onLoadFlow(item);
    }
    onClose();
  };

  const filterItems = (items: (SavedFlow | FlowTemplate)[]) => {
    if (!searchQuery) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.metadata.name.toLowerCase().includes(query) ||
      item.metadata.description?.toLowerCase().includes(query) ||
      item.metadata.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  };

  const filteredFlows = filterItems(flows);
  const filteredTemplates = filterItems(templates);

  const renderList = (items: (SavedFlow | FlowTemplate)[], isTemplate: boolean) => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" p={3}>
          <Typography color="textSecondary">Loading...</Typography>
        </Box>
      );
    }

    if (items.length === 0) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" p={3}>
          <Typography color="textSecondary">
            {searchQuery ? 'No results found' : `No ${isTemplate ? 'templates' : 'flows'} saved yet`}
          </Typography>
        </Box>
      );
    }

    return (
      <List>
        {items.map((item) => (
          <ListItem
            key={item.metadata.id}
            component="div"
            onClick={() => handleLoad(item)}
            style={{
              borderBottom: '1px solid var(--node-border-color)',
              backgroundColor: 'var(--node-header-background)',
              marginBottom: '4px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  {isTemplate ? <TemplateIcon fontSize="small" /> : <FolderIcon fontSize="small" />}
                  <Typography style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {item.metadata.name}
                  </Typography>
                </Box>
              }
              secondary={
                <Box mt={0.5}>
                  {item.metadata.description && (
                    <Typography
                      variant="body2"
                      style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}
                    >
                      {item.metadata.description}
                    </Typography>
                  )}
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="caption" style={{ color: 'var(--color-text-secondary)' }}>
                      Updated {formatDistanceToNow(new Date(item.metadata.updatedAt), { addSuffix: true })}
                    </Typography>
                    {item.metadata.tags?.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        style={{
                          backgroundColor: 'var(--color-accent-primary)',
                          color: 'white',
                          height: '20px',
                          fontSize: '10px'
                        }}
                      />
                    ))}
                    {isTemplate && (item as FlowTemplate).category && (
                      <Chip
                        label={(item as FlowTemplate).category}
                        size="small"
                        style={{
                          backgroundColor: 'var(--color-accent-secondary)',
                          color: 'white',
                          height: '20px',
                          fontSize: '10px'
                        }}
                      />
                    )}
                    {isTemplate && (item as FlowTemplate).usageCount !== undefined && (
                      <Typography variant="caption" style={{ color: 'var(--color-text-secondary)' }}>
                        Used {(item as FlowTemplate).usageCount} times
                      </Typography>
                    )}
                  </Box>
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.metadata.id, isTemplate);
                }}
                style={{ color: 'var(--color-accent-error)' }}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: 'var(--node-body-background)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--node-border-color)',
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Load Flow or Template</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search by name, description, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon style={{ color: 'var(--color-text-secondary)' }} />
              </InputAdornment>
            ),
            style: {
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--node-header-background)',
              borderColor: 'var(--node-border-color)'
            }
          }}
        />

        {/* Tabs */}
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          style={{ borderBottom: '1px solid var(--node-border-color)' }}
        >
          <Tab
            label={`Flows (${filteredFlows.length})`}
            value="flows"
            style={{ color: 'var(--color-text-primary)' }}
          />
          <Tab
            label={`Templates (${filteredTemplates.length})`}
            value="templates"
            style={{ color: 'var(--color-text-primary)' }}
          />
        </Tabs>

        {/* Content */}
        <Box mt={2} style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {tabValue === 'flows' && renderList(filteredFlows, false)}
          {tabValue === 'templates' && renderList(filteredTemplates, true)}
        </Box>
      </DialogContent>

      <DialogActions style={{ padding: '16px 24px' }}>
        <Button
          onClick={onClose}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoadFlowDialog;
