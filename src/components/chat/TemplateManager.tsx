import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Plus, Edit, Trash2, Eye, Copy } from 'lucide-react';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';

interface TemplateManagerProps {
  trigger?: React.ReactNode;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [isPublic, setIsPublic] = useState(false);
  const [variables, setVariables] = useState<string[]>([]);
  const [newVariable, setNewVariable] = useState('');

  const { 
    templates, 
    loading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    parseTemplate 
  } = useMessageTemplates();

  const resetForm = () => {
    setName('');
    setContent('');
    setCategory('general');
    setIsPublic(false);
    setVariables([]);
    setNewVariable('');
    setEditingTemplate(null);
    setCreateMode(false);
  };

  const handleCreate = () => {
    setCreateMode(true);
    resetForm();
  };

  const handleEdit = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setName(template.name);
      setContent(template.content);
      setCategory(template.category);
      setIsPublic(template.isPublic);
      setVariables(template.variables);
      setEditingTemplate(templateId);
      setCreateMode(false);
    }
  };

  const handleSave = async () => {
    const templateData = {
      name,
      content,
      category,
      variables,
      isPublic,
    };

    let success = false;
    if (editingTemplate) {
      success = await updateTemplate(editingTemplate, templateData);
    } else {
      success = await createTemplate(templateData);
    }

    if (success) {
      resetForm();
    }
  };

  const handleDelete = async (templateId: string) => {
    await deleteTemplate(templateId);
  };

  const addVariable = () => {
    if (newVariable.trim() && !variables.includes(newVariable.trim())) {
      setVariables([...variables, newVariable.trim()]);
      setNewVariable('');
    }
  };

  const removeVariable = (variable: string) => {
    setVariables(variables.filter(v => v !== variable));
  };

  const getVariablesFromContent = (content: string): string[] => {
    const regex = /{{(\w+)}}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  const copyTemplate = (template: any) => {
    navigator.clipboard.writeText(template.content);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <FileText className="h-4 w-4 mr-2" />
      Templates
    </Button>
  );

  const isFormMode = createMode || editingTemplate;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Message Templates
            </div>
            {!isFormMode && (
              <Button onClick={handleCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isFormMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter template name"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="trading">Trading</SelectItem>
                    <SelectItem value="market-update">Market Update</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Template Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your template content. Use {{variableName}} for variables."
                className="min-h-[150px]"
              />
              <p className="text-sm text-muted-foreground">
                Use {'{{variableName}}'} to insert variables. Detected variables: {getVariablesFromContent(content).join(', ') || 'None'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Variables</Label>
              <div className="flex gap-2">
                <Input
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  placeholder="Add variable name"
                  onKeyPress={(e) => e.key === 'Enter' && addVariable()}
                />
                <Button onClick={addVariable} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {variables.map(variable => (
                  <Badge key={variable} variant="secondary" className="cursor-pointer" onClick={() => removeVariable(variable)}>
                    {variable} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="public">Make this template public</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!name.trim() || !content.trim()}
              >
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No templates found. Create your first template to get started.
              </div>
            ) : (
              <div className="grid gap-4">
                {templates.map(template => (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="outline">{template.category}</Badge>
                          {template.isPublic && <Badge variant="secondary">Public</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyTemplate(template)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(template.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.content.length > 150 
                          ? template.content.substring(0, 150) + '...'
                          : template.content
                        }
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Used {template.usageCount} times</span>
                        {template.variables.length > 0 && (
                          <span>Variables: {template.variables.join(', ')}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};