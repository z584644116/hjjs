'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  Input,
  Title2,
  Body1,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Field,
  MessageBar,
  MessageBarBody,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import {
  Add24Regular,
  Edit24Regular,
  Delete24Regular,
  MoreVertical24Regular,
} from '@fluentui/react-icons';
import { useInstrumentStore } from '@/stores';
import { Instrument } from '@/types';

interface InstrumentFormProps {
  instrument?: Instrument;
  onClose: () => void;
  onSave: (model: string, maxFlowRate: number) => void;
}

function InstrumentForm({ instrument, onClose, onSave }: InstrumentFormProps) {
  const [model, setModel] = useState(instrument?.model || '');
  const [maxFlowRate, setMaxFlowRate] = useState(
    instrument?.maxFlowRate?.toString() || ''
  );
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!model.trim()) {
      setError('请输入仪器型号');
      return;
    }

    const flowRate = parseFloat(maxFlowRate);
    if (isNaN(flowRate) || flowRate <= 0) {
      setError('请输入有效的最高采样流量');
      return;
    }

    onSave(model.trim(), flowRate);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}
        
        <Field label="仪器型号" required>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="请输入仪器型号"
            required
          />
        </Field>

        <Field label="最高采样流量 (L/min)" required>
          <Input
            type="number"
            value={maxFlowRate}
            onChange={(e) => setMaxFlowRate(e.target.value)}
            placeholder="请输入最高采样流量"
            min="0"
            step="0.1"
            required
          />
        </Field>
      </div>
      
      <DialogActions style={{ marginTop: '20px' }}>
        <Button onClick={onClose}>
          取消
        </Button>
        <Button type="submit" appearance="primary">
          {instrument ? '保存' : '添加'}
        </Button>
      </DialogActions>
    </form>
  );
}

export default function InstrumentManager() {
  const { instruments, addInstrument, updateInstrument, deleteInstrument } = useInstrumentStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleAddInstrument = (model: string, maxFlowRate: number) => {
    addInstrument(model, maxFlowRate);
  };

  const handleUpdateInstrument = (model: string, maxFlowRate: number) => {
    if (editingInstrument) {
      updateInstrument(editingInstrument.id, { model, maxFlowRate });
      setEditingInstrument(null);
    }
  };

  const handleDeleteInstrument = (id: string) => {
    deleteInstrument(id);
    setShowDeleteConfirm(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title2>仪器管理</Title2>
        <Button
          appearance="primary"
          icon={<Add24Regular />}
          onClick={() => setShowAddDialog(true)}
        >
          添加仪器
        </Button>
      </div>

      {instruments.length === 0 ? (
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <Body1 style={{ color: 'var(--colorNeutralForeground2)' }}>
            暂无仪器数据，请点击&ldquo;添加仪器&rdquo;按钮添加您的第一台仪器
          </Body1>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>仪器型号</TableHeaderCell>
                <TableHeaderCell>最高采样流量 (L/min)</TableHeaderCell>
                <TableHeaderCell>创建时间</TableHeaderCell>
                <TableHeaderCell style={{ width: '80px' }}>操作</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instruments.map((instrument) => (
                <TableRow key={instrument.id}>
                  <TableCell>
                    <TableCellLayout>{instrument.model}</TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <TableCellLayout>{instrument.maxFlowRate}</TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <TableCellLayout>
                      {new Date(instrument.createdAt).toLocaleDateString('zh-CN')}
                    </TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <Menu>
                      <MenuTrigger>
                        <Button
                          appearance="subtle"
                          icon={<MoreVertical24Regular />}
                        />
                      </MenuTrigger>
                      <MenuPopover>
                        <MenuList>
                          <MenuItem
                            icon={<Edit24Regular />}
                            onClick={() => setEditingInstrument(instrument)}
                          >
                            编辑
                          </MenuItem>
                          <MenuItem
                            icon={<Delete24Regular />}
                            onClick={() => setShowDeleteConfirm(instrument.id)}
                          >
                            删除
                          </MenuItem>
                        </MenuList>
                      </MenuPopover>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 添加对话框 */}
      <Dialog open={showAddDialog}>
        <DialogSurface>
          <DialogTitle>添加仪器</DialogTitle>
          <DialogContent>
            <DialogBody>
              <InstrumentForm
                onClose={() => setShowAddDialog(false)}
                onSave={handleAddInstrument}
              />
            </DialogBody>
          </DialogContent>
        </DialogSurface>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={!!editingInstrument}>
        <DialogSurface>
          <DialogTitle>编辑仪器</DialogTitle>
          <DialogContent>
            <DialogBody>
              {editingInstrument && (
                <InstrumentForm
                  instrument={editingInstrument}
                  onClose={() => setEditingInstrument(null)}
                  onSave={handleUpdateInstrument}
                />
              )}
            </DialogBody>
          </DialogContent>
        </DialogSurface>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!showDeleteConfirm}>
        <DialogSurface>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <DialogBody>
              <Body1>确定要删除这台仪器吗？此操作不可撤销。</Body1>
            </DialogBody>
            <DialogActions>
              <Button onClick={() => setShowDeleteConfirm(null)}>
                取消
              </Button>
              <Button
                appearance="primary"
                onClick={() => showDeleteConfirm && handleDeleteInstrument(showDeleteConfirm)}
              >
                确认删除
              </Button>
            </DialogActions>
          </DialogContent>
        </DialogSurface>
      </Dialog>
    </div>
  );
}