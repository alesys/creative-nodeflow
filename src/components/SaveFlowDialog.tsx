/**
 * Save Flow Dialog Component
 * Allows users to save the current flow with metadata
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Box,
  Typography
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import type { SaveFlowDialogData } from '../types/flow';

interface SaveFlowDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SaveFlowDialogData) => void;
  currentFlowName?: string;
  currentFlowDescription?: string;
  currentFlowTags?: string[];
  isTemplate?: boolean;
}

const TEMPLATE_CATEGORIES = [
  'Content Creation',
  'Image Generation',
  'Video Production',
  'Marketing',
  'Social Media',
  'Workflow Automation',
  'Other'
];

const SaveFlowDialog: React.FC<SaveFlowDialogProps> = ({
  open,
  onClose,
  onSave,
  currentFlowName = '',
  currentFlowDescription = '',
  currentFlowTags = [],
  isTemplate = false
}) => {
  const [name, setName] = useState(currentFlowName);
  const [description, setDescription] = useState(currentFlowDescription);
  const [tags, setTags] = useState<string[]>(currentFlowTags);
  const [tagInput, setTagInput] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(isTemplate);
  const [templateCategory, setTemplateCategory] = useState('Other');

  const handleSave = () => {
    if (!name.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      saveAsTemplate,
      templateCategory: saveAsTemplate ? templateCategory : undefined
    });

    onClose();
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: 'var(--node-body-background)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--node-border-color)'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SaveIcon />
          <Typography variant="h6">
            {saveAsTemplate ? 'Save as Template' : 'Save Flow'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          {/* Flow Name */}
          <TextField
            label="Flow Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            autoFocus
            placeholder="My Awesome Flow"
            variant="outlined"
            InputLabelProps={{
              style: { color: 'var(--color-text-secondary)' }
            }}
            InputProps={{
              style: {
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--node-header-background)',
                borderColor: 'var(--node-border-color)'
              }
            }}
          />

          {/* Description */}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Describe what this flow does..."
            variant="outlined"
            InputLabelProps={{
              style: { color: 'var(--color-text-secondary)' }
            }}
            InputProps={{
              style: {
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--node-header-background)',
                borderColor: 'var(--node-border-color)'
              }
            }}
          />

          {/* Tags */}
          <Box>
            <TextField
              label="Add Tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              fullWidth
              placeholder="Press Enter to add tag"
              variant="outlined"
              InputLabelProps={{
                style: { color: 'var(--color-text-secondary)' }
              }}
              InputProps={{
                style: {
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--node-header-background)',
                  borderColor: 'var(--node-border-color)'
                }
              }}
            />
            <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                  style={{
                    backgroundColor: 'var(--color-accent-primary)',
                    color: 'white'
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Save as Template */}
          <FormControlLabel
            control={
              <Checkbox
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                style={{ color: 'var(--color-accent-primary)' }}
              />
            }
            label="Save as Template (reusable pattern)"
            style={{ color: 'var(--color-text-primary)' }}
          />

          {/* Template Category */}
          {saveAsTemplate && (
            <FormControl fullWidth>
              <InputLabel
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Template Category
              </InputLabel>
              <Select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                label="Template Category"
                style={{
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--node-header-background)'
                }}
              >
                {TEMPLATE_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </DialogContent>

      <DialogActions style={{ padding: '16px 24px' }}>
        <Button
          onClick={onClose}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim()}
          startIcon={<SaveIcon />}
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            color: 'white'
          }}
        >
          {saveAsTemplate ? 'Save Template' : 'Save Flow'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveFlowDialog;
