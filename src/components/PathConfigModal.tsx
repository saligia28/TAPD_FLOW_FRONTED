import type { FC } from 'react';
import { useState } from 'react';
import type { PathConfig } from '../types';

type Props = {
  paths: PathConfig[];
  onClose: () => void;
  onSave: (paths: PathConfig[]) => void;
  onError: (message: string) => void;
};

const PathConfigModal: FC<Props> = ({ paths, onClose, onSave, onError }) => {
  const [configs, setConfigs] = useState<PathConfig[]>(paths);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPath, setEditPath] = useState('');

  const handleAdd = () => {
    const newId = Date.now().toString();
    setConfigs([...configs, { id: newId, label: '', path: '' }]);
    setEditingId(newId);
    setEditLabel('');
    setEditPath('');
  };

  const handleEdit = (config: PathConfig) => {
    setEditingId(config.id);
    setEditLabel(config.label);
    setEditPath(config.path);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    if (!editLabel.trim() || !editPath.trim()) return;

    const trimmedLabel = editLabel.trim();
    const trimmedPath = editPath.trim();

    // 检查标签重名(排除当前编辑项)
    const duplicateLabel = configs.find(c => c.id !== editingId && c.label.trim() === trimmedLabel);
    if (duplicateLabel) {
      onError(`标签名称已存在: ${trimmedLabel}`);
      return;
    }

    // 检查路径重复(排除当前编辑项)
    const duplicatePath = configs.find(c => c.id !== editingId && c.path.trim() === trimmedPath);
    if (duplicatePath) {
      onError(`路径已存在: ${trimmedPath}`);
      return;
    }

    setConfigs(configs.map(c =>
      c.id === editingId
        ? { ...c, label: trimmedLabel, path: trimmedPath }
        : c
    ));
    setEditingId(null);
    setEditLabel('');
    setEditPath('');
  };

  const handleCancelEdit = () => {
    if (editingId) {
      const config = configs.find(c => c.id === editingId);
      if (config && !config.label && !config.path) {
        setConfigs(configs.filter(c => c.id !== editingId));
      }
    }
    setEditingId(null);
    setEditLabel('');
    setEditPath('');
  };

  const handleDelete = (id: string) => {
    setConfigs(configs.filter(c => c.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditLabel('');
      setEditPath('');
    }
  };

  const handleSave = () => {
    const validConfigs = configs.filter(c => c.label.trim() && c.path.trim());
    onSave(validConfigs);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-hacker-panel border border-hacker-border w-full max-w-2xl font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-hacker-border px-4 py-2">
          <p className="text-[10px] uppercase tracking-widest text-hacker-primary">
            &gt; PATH_CONFIGURATION
          </p>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {configs.map((config) => (
            <div key={config.id} className="border border-hacker-border bg-black/40 p-3">
              {editingId === config.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="标签名称"
                    className="w-full bg-black/40 border border-hacker-border px-2 py-1 text-xs text-hacker-text-main focus:border-hacker-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={editPath}
                    onChange={(e) => setEditPath(e.target.value)}
                    placeholder="/path/to/project"
                    className="w-full bg-black/40 border border-hacker-border px-2 py-1 text-xs text-hacker-text-main focus:border-hacker-primary focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editLabel.trim() || !editPath.trim()}
                      className="px-2 py-1 text-[9px] uppercase border border-hacker-primary text-hacker-primary hover:bg-hacker-primary hover:text-black transition-colors disabled:opacity-50"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-2 py-1 text-[9px] uppercase border border-hacker-border text-hacker-text-dim hover:text-hacker-primary hover:border-hacker-primary transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-hacker-primary font-bold">{config.label}</p>
                    <p className="text-[10px] text-hacker-text-dim truncate">{config.path}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(config)}
                      className="px-2 py-0.5 text-[9px] uppercase border border-hacker-border text-hacker-text-dim hover:text-hacker-primary hover:border-hacker-primary transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="px-2 py-0.5 text-[9px] uppercase border border-hacker-alert text-hacker-alert hover:bg-hacker-alert hover:text-black transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {configs.length === 0 && (
            <div className="text-center py-8 text-xs text-hacker-text-dim">
              暂无配置路径，点击下方按钮添加
            </div>
          )}
        </div>

        <div className="border-t border-hacker-border px-4 py-3 flex justify-between">
          <button
            onClick={handleAdd}
            disabled={editingId !== null}
            className="px-3 py-1 text-[10px] uppercase tracking-wider border border-hacker-primary text-hacker-primary hover:bg-hacker-primary hover:text-black transition-colors disabled:opacity-50"
          >
            [添加路径]
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-[10px] uppercase tracking-wider border border-hacker-border text-hacker-text-dim hover:text-hacker-primary hover:border-hacker-primary transition-colors"
            >
              [取消]
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-[10px] uppercase tracking-wider border border-hacker-primary bg-hacker-primary text-black hover:bg-transparent hover:text-hacker-primary transition-colors"
            >
              [保存]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PathConfigModal;
