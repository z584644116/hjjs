'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  Button,
  Input,
  Label,
  Title1,
  Title2,
  Body1,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbButton,
  Divider,
  Text,
} from '@fluentui/react-components';
import { ArrowLeft24Regular, Calculator24Regular, Dismiss20Regular, Add20Regular } from '@fluentui/react-icons';

// Data definitions (based on 水质质量控制分析工具.html)
const equivalentWeights: Record<string, number> = {
  'k': 39.1,
  'na': 23.0,
  'ca': 20.04,
  'mg': 12.15,
  'cl': 35.45,
  'so4': 48.03,
  'hco3': 61.02,
  'co3': 30.005,
};

type IonOption = { key: string; name: string; molarMass: number; charge: number };

const optionalCations: Record<string, IonOption> = {
  fe2: { key: 'fe2', name: '亚铁 (Fe²⁺)', molarMass: 55.845, charge: 2 },
  fe3: { key: 'fe3', name: '铁(III) (Fe³⁺)', molarMass: 55.845, charge: 3 },
  mn2: { key: 'mn2', name: '锰 (Mn²⁺)', molarMass: 54.938, charge: 2 },
  nh4: { key: 'nh4', name: '铵 (NH₄⁺)', molarMass: 18.039, charge: 1 },
  pb2: { key: 'pb2', name: '铅 (Pb²⁺)', molarMass: 207.2, charge: 2 },
};

const optionalAnions: Record<string, IonOption> = {
  f: { key: 'f', name: '氟 (F⁻)', molarMass: 18.998, charge: -1 },
  no3: { key: 'no3', name: '硝酸根 (NO₃⁻)', molarMass: 62.004, charge: -1 },
  no2: { key: 'no2', name: '亚硝酸根 (NO₂⁻)', molarMass: 46.005, charge: -1 },
  po4: { key: 'po4', name: '磷酸根 (PO₄³⁻)', molarMass: 94.971, charge: -3 },
  cro4: { key: 'cro4', name: '铬酸根 (CrO₄²⁻)', molarMass: 115.99, charge: -2 },
};

const KSP = { CaCO3: 3.8e-9, CaSO4: 2.4e-5, PbCrO4: 1.8e-14, PbSO4: 1.7e-8 };

function parseNum(str: string): number { return str.trim() === '' ? 0 : parseFloat(str.replace(',', '.')); }

type OptionalRow = { id: string; key: string; conc: string };

export default function WaterQualityQCPage() {
  // base ions (mg/L)
  const [k, setK] = useState('');
  const [na, setNa] = useState('');
  const [ca, setCa] = useState('');
  const [mg, setMg] = useState('');
  const [cl, setCl] = useState('');
  const [so4, setSo4] = useState('');
  const [hco3, setHco3] = useState('');
  const [co3, setCo3] = useState('');

  // optional ions
  const [optCations, setOptCations] = useState<OptionalRow[]>([]);
  const [optAnions, setOptAnions] = useState<OptionalRow[]>([]);

  // other params
  const [tdsMeasured, setTdsMeasured] = useState('');
  const [ecMeasured, setEcMeasured] = useState('');
  const [hardnessMeasured, setHardnessMeasured] = useState('');
  const [pbFixed, setPbFixed] = useState(''); // Pb2+ (mg/L)
  const [cro4Fixed, setCro4Fixed] = useState(''); // CrO4^2- (mg/L)

  const [showResult, setShowResult] = useState(false);

  const ionBalance = useMemo(() => {
    // core ions
    const cationsMeq = (parseNum(k)/equivalentWeights.k) + (parseNum(na)/equivalentWeights.na) + (parseNum(ca)/equivalentWeights.ca) + (parseNum(mg)/equivalentWeights.mg);
    const anionsMeq = (parseNum(cl)/equivalentWeights.cl) + (parseNum(so4)/equivalentWeights.so4) + (parseNum(hco3)/equivalentWeights.hco3) + (parseNum(co3)/equivalentWeights.co3);

    // optional
    let cOpt = 0, aOpt = 0;
    optCations.forEach(r => {
      const v = parseNum(r.conc);
      if (!r.key || v <= 0) return;
      const info = optionalCations[r.key];
      if (!info) return;
      const meq = v / (info.molarMass / Math.abs(info.charge));
      cOpt += meq;
    });
    optAnions.forEach(r => {
      const v = parseNum(r.conc);
      if (!r.key || v <= 0) return;
      const info = optionalAnions[r.key];
      if (!info) return;
      const meq = v / (info.molarMass / Math.abs(info.charge));
      aOpt += meq;
    });

    // fixed from other params panel (Pb2+, CrO4^2-)
    const pb2 = parseNum(pbFixed);
    if (pb2 > 0) {
      const infoPb = optionalCations.pb2; // exists
      cOpt += pb2 / (infoPb.molarMass / Math.abs(infoPb.charge));
    }
    const cro4 = parseNum(cro4Fixed);
    if (cro4 > 0) {
      const infoCr = optionalAnions.cro4; // exists
      aOpt += cro4 / (infoCr.molarMass / Math.abs(infoCr.charge));
    }

    const totalC = cationsMeq + cOpt;
    const totalA = anionsMeq + aOpt;
    const sum = totalC + totalA;
    const error = sum > 0 ? ((totalC - totalA) / sum) * 100 : 0;
    const ok = Math.abs(error) <= 10;

    return { totalC, totalA, error, ok };
  }, [k,na,ca,mg,cl,so4,hco3,co3,optCations,optAnions,pbFixed,cro4Fixed]);

  const tdsVsIons = useMemo(() => {
    const tds = parseNum(tdsMeasured);
    const ions: Record<string, number> = {
      k: parseNum(k), na: parseNum(na), ca: parseNum(ca), mg: parseNum(mg),
      cl: parseNum(cl), so4: parseNum(so4), hco3: parseNum(hco3), co3: parseNum(co3),
    };
    // optional add to ions map
    optCations.forEach(r => { const v = parseNum(r.conc); if (r.key && v>0) ions[r.key] = (ions[r.key]||0) + v; });
    optAnions.forEach(r => { const v = parseNum(r.conc); if (r.key && v>0) ions[r.key] = (ions[r.key]||0) + v; });
    const pb2 = parseNum(pbFixed); if (pb2>0) ions['pb2'] = (ions['pb2']||0)+pb2;
    const cro4 = parseNum(cro4Fixed); if (cro4>0) ions['cro4'] = (ions['cro4']||0)+cro4;

    let calculatedTds = 0;
    for (const key in ions) {
      if (key === 'hco3') calculatedTds += ions[key] * (60/122); else calculatedTds += ions[key];
    }
    const error = tds>0 ? ((calculatedTds/tds)-1)*100 : 0;
    const ok = Math.abs(error) <= 10;
    return { calculatedTds, tds, error, ok };
  }, [k,na,ca,mg,cl,so4,hco3,co3,optCations,optAnions,pbFixed,cro4Fixed,tdsMeasured]);

  const tdsVsEc = useMemo(() => {
    const tds = parseNum(tdsMeasured); const ec = parseNum(ecMeasured);
    const ratio = (tds>0 && ec>0) ? (tds/ec) : 0;
    const ok = ratio>=0.55 && ratio<=0.70;
    return { ratio, ok };
  }, [tdsMeasured, ecMeasured]);

  const ecVsIons = useMemo(() => {
    const ec = parseNum(ecMeasured);
    const c = ionBalance.totalC; const a = ionBalance.totalA;
    const errorC = ec>0 ? ((c*100/ec)-1)*100 : 0;
    const errorA = ec>0 ? ((a*100/ec)-1)*100 : 0;
    return { errorC, errorA, okC: Math.abs(errorC)<=10, okA: Math.abs(errorA)<=10 };
  }, [ionBalance, ecMeasured]);

  const hardness = useMemo(() => {
    const meas = parseNum(hardnessMeasured);
    const caV = parseNum(ca); const mgV = parseNum(mg);
    // optional Fe3, Mn2
    let fe3V = 0, mn2V = 0;
    optCations.forEach(r=>{ const v=parseNum(r.conc); if (r.key==='fe3') fe3V+=v; if (r.key==='mn2') mn2V+=v; });
    const calc = ((caV/20)+(mgV/12)+(fe3V/18.6)+(mn2V/27.5))*50;
    const error = meas>0 ? ((calc/meas)-1)*100 : 0;
    const ok = Math.abs(error)<=10;
    return { calc, meas, error, ok };
  }, [hardnessMeasured, ca, mg, optCations]);

  const solubility = useMemo(() => {
    const caMol = parseNum(ca)/1000/40.08;
    const co3Mol = parseNum(co3)/1000/60.009;
    const so4Mol = parseNum(so4)/1000/96.06;
    const pbMol = parseNum(pbFixed)/1000/optionalCations.pb2.molarMass;
    const cro4Mol = parseNum(cro4Fixed)/1000/optionalAnions.cro4.molarMass;

    const iap_CaCO3 = caMol*co3Mol;
    const iap_CaSO4 = caMol*so4Mol;
    const iap_PbCrO4 = pbMol*cro4Mol;
    const iap_PbSO4 = pbMol*so4Mol;

    const status = (iap:number, ksp:number) => {
      if (iap===0) return '数据不足';
      const r = iap/ksp; if (r>1.1) return '过饱和'; if (r<0.9) return '未饱和'; return '饱和';
    };

    return {
      CaCO3: { iap: iap_CaCO3, ksp: KSP.CaCO3, status: status(iap_CaCO3, KSP.CaCO3) },
      CaSO4: { iap: iap_CaSO4, ksp: KSP.CaSO4, status: status(iap_CaSO4, KSP.CaSO4) },
      PbCrO4: { iap: iap_PbCrO4, ksp: KSP.PbCrO4, status: status(iap_PbCrO4, KSP.PbCrO4) },
      PbSO4: { iap: iap_PbSO4, ksp: KSP.PbSO4, status: status(iap_PbSO4, KSP.PbSO4) },
    };
  }, [ca, co3, so4, pbFixed, cro4Fixed]);

  const resetAll = () => {
    setK(''); setNa(''); setCa(''); setMg(''); setCl(''); setSo4(''); setHco3(''); setCo3('');
    setOptCations([]); setOptAnions([]);
    setTdsMeasured(''); setEcMeasured(''); setHardnessMeasured(''); setPbFixed(''); setCro4Fixed('');
    setShowResult(false);
  };

  const addCation = () => setOptCations(prev => [...prev, { id: crypto.randomUUID(), key: '', conc: '' }]);
  const addAnion = () => setOptAnions(prev => [...prev, { id: crypto.randomUUID(), key: '', conc: '' }]);

  return (
    <div className="page-container">
      <Breadcrumb style={{ marginBottom: 20 }}>
        <BreadcrumbItem>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <ArrowLeft24Regular /> 返回首页
          </Link>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbButton current>水质质量控制分析</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>

      <Title1 style={{ marginBottom: 16 }}>水质质量控制分析</Title1>
      <Body1 style={{ color: 'var(--colorNeutralForeground2)', marginBottom: 16 }}>多模型水质评价（移动端与桌面端自适应）</Body1>

      <div className="bg-gray-100" style={{ padding: 16, borderRadius: 8 }}>
        <Title2 style={{ fontSize: 16, marginBottom: 8 }}>基础离子 (mg/L)</Title2>
        <div className="ionGrid">
          <div className="ionRow">
            <Label>钾 K⁺</Label>
            <Input type="text" inputMode="decimal" value={k} onChange={e=>setK((e.target as HTMLInputElement).value)} placeholder="例如 2.5" />
          </div>
          <div className="ionRow">
            <Label>钠 Na⁺</Label>
            <Input type="text" inputMode="decimal" value={na} onChange={e=>setNa((e.target as HTMLInputElement).value)} placeholder="例如 15.0" />
          </div>
          <div className="ionRow">
            <Label>钙 Ca²⁺</Label>
            <Input type="text" inputMode="decimal" value={ca} onChange={e=>setCa((e.target as HTMLInputElement).value)} placeholder="例如 80.2" />
          </div>
          <div className="ionRow">
            <Label>镁 Mg²⁺</Label>
            <Input type="text" inputMode="decimal" value={mg} onChange={e=>setMg((e.target as HTMLInputElement).value)} placeholder="例如 24.3" />
          </div>
          <div className="ionRow">
            <Label>氯 Cl⁻</Label>
            <Input type="text" inputMode="decimal" value={cl} onChange={e=>setCl((e.target as HTMLInputElement).value)} placeholder="例如 20.0" />
          </div>
          <div className="ionRow">
            <Label>硫酸根 SO₄²⁻</Label>
            <Input type="text" inputMode="decimal" value={so4} onChange={e=>setSo4((e.target as HTMLInputElement).value)} placeholder="例如 96.0" />
          </div>
          <div className="ionRow">
            <Label>碳酸氢根 HCO₃⁻</Label>
            <Input type="text" inputMode="decimal" value={hco3} onChange={e=>setHco3((e.target as HTMLInputElement).value)} placeholder="例如 122.0" />
          </div>
          <div className="ionRow">
            <Label>碳酸根 CO₃²⁻</Label>
            <Input type="text" inputMode="decimal" value={co3} onChange={e=>setCo3((e.target as HTMLInputElement).value)} placeholder="例如 1.0" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <Card>
          <Title2 style={{ fontSize: 16, marginBottom: 8 }}>可选阳离子</Title2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {optCations.map((row, idx) => (
              <div key={row.id} className="optionalRow">
                <select value={row.key} onChange={e=>setOptCations(prev=>prev.map(r=>r.id===row.id?{...r,key:e.target.value}:r))} style={{ height: 32, borderRadius: 4 }}>
                  <option value="">-- 选择 --</option>
                  {Object.values(optionalCations).map(opt=> (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
                <Input type="text" inputMode="decimal" value={row.conc} onChange={e=>setOptCations(prev=>prev.map(r=>r.id===row.id?{...r,conc:(e.target as HTMLInputElement).value}:r))} placeholder="浓度 (mg/L)" />
                <Button icon={<Dismiss20Regular />} onClick={()=>setOptCations(prev=>prev.filter(r=>r.id!==row.id))} aria-label="删除" />
              </div>
            ))}
            <Button appearance="secondary" icon={<Add20Regular />} onClick={addCation}>添加阳离子</Button>
          </div>
        </Card>

        <Card>
          <Title2 style={{ fontSize: 16, marginBottom: 8 }}>可选阴离子</Title2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {optAnions.map((row) => (
              <div key={row.id} className="optionalRow">
                <select value={row.key} onChange={e=>setOptAnions(prev=>prev.map(r=>r.id===row.id?{...r,key:e.target.value}:r))} style={{ height: 32, borderRadius: 4 }}>
                  <option value="">-- 选择 --</option>
                  {Object.values(optionalAnions).map(opt=> (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
                <Input type="text" inputMode="decimal" value={row.conc} onChange={e=>setOptAnions(prev=>prev.map(r=>r.id===row.id?{...r,conc:(e.target as HTMLInputElement).value}:r))} placeholder="浓度 (mg/L)" />
                <Button icon={<Dismiss20Regular />} onClick={()=>setOptAnions(prev=>prev.filter(r=>r.id!==row.id))} aria-label="删除" />
              </div>
            ))}
            <Button appearance="secondary" icon={<Add20Regular />} onClick={addAnion}>添加阴离子</Button>
          </div>
        </Card>
      </div>

      <Card style={{ padding: 16, borderRadius: 8, marginTop: 12 }}>
        <Title2 style={{ fontSize: 16, marginBottom: 8 }}>其他水质参数</Title2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div><Label>TDS 实测 (mg/L)</Label><Input type="text" inputMode="decimal" value={tdsMeasured} onChange={e=>setTdsMeasured((e.target as HTMLInputElement).value)} placeholder="例如 350" /></div>
          <div><Label>电导率实测 (μS/cm)</Label><Input type="text" inputMode="decimal" value={ecMeasured} onChange={e=>setEcMeasured((e.target as HTMLInputElement).value)} placeholder="例如 550" /></div>
          <div><Label>总硬度实测 (mg/L)</Label><Input type="text" inputMode="decimal" value={hardnessMeasured} onChange={e=>setHardnessMeasured((e.target as HTMLInputElement).value)} placeholder="例如 250" /></div>
          <div><Label>Pb²⁺ (mg/L)</Label><Input type="text" inputMode="decimal" value={pbFixed} onChange={e=>setPbFixed((e.target as HTMLInputElement).value)} placeholder="例如 0.5" /></div>
          <div><Label>CrO₄²⁻ (mg/L)</Label><Input type="text" inputMode="decimal" value={cro4Fixed} onChange={e=>setCro4Fixed((e.target as HTMLInputElement).value)} placeholder="例如 0.3" /></div>
        </div>

        <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--colorNeutralStroke2)', paddingTop: 12, marginTop: 12 }}>
          <Button appearance="primary" size="large" icon={<Calculator24Regular />} onClick={()=>setShowResult(true)}>开始计算</Button>
          <Button onClick={resetAll}>重置</Button>
        </div>
      </Card>

      {showResult && (
        <div style={{ marginTop: 16 }}>
          <Divider>分析结果</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <Card style={{ padding: 12 }}>
              <Title2 style={{ fontSize: 16, marginBottom: 6 }}>阴阳离子平衡</Title2>
              <Body1>总阳离子：{ionBalance.totalC.toFixed(3)} meq/L</Body1>
              <Body1>总阴离子：{ionBalance.totalA.toFixed(3)} meq/L</Body1>
              <Body1>相对误差：{ionBalance.error.toFixed(2)}%</Body1>
              <Body1>评价：{ionBalance.ok ? '合格' : '不合格'}</Body1>
            </Card>

            <Card style={{ padding: 12 }}>
              <Title2 style={{ fontSize: 16, marginBottom: 6 }}>TDS & 离子总量</Title2>
              <Body1>离子总量计算值：{tdsVsIons.calculatedTds.toFixed(2)} mg/L</Body1>
              <Body1>TDS 实测值：{tdsVsIons.tds.toFixed(2)} mg/L</Body1>
              <Body1>相对误差：{tdsVsIons.error.toFixed(2)}%</Body1>
              <Body1>评价：{tdsVsIons.ok ? '合格' : '不合格'}</Body1>
            </Card>

            <Card style={{ padding: 12 }}>
              <Title2 style={{ fontSize: 16, marginBottom: 6 }}>TDS & 电导率</Title2>
              <Body1>比值 (TDS/EC)：{tdsVsEc.ratio.toFixed(3)}</Body1>
              <Body1>评价：{tdsVsEc.ok ? '合格' : '不合格'}</Body1>
            </Card>

            <Card style={{ padding: 12 }}>
              <Title2 style={{ fontSize: 16, marginBottom: 6 }}>电导率 & 离子</Title2>
      <style jsx>{`
        .ionGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        @media (max-width: 768px) { .ionGrid { grid-template-columns: 1fr; } }
        .ionRow { display: flex; align-items: center; gap: 8px; }
        .ionRow label { min-width: 120px; white-space: nowrap; flex-shrink: 0; }
        .ionRow input { flex: 1; }
        .optionalRow { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(160px, 1fr) auto; gap: 8px; align-items: center; }
        @media (max-width: 600px) { .optionalRow { grid-template-columns: 1fr; } }
      `}</style>

              <Body1>阳离子校核误差：{ecVsIons.errorC.toFixed(2)}%</Body1>
              <Body1>阴离子校核误差：{ecVsIons.errorA.toFixed(2)}%</Body1>
              <Body1>评价：{ecVsIons.okC && ecVsIons.okA ? '合格' : '不合格'}</Body1>
            </Card>

            <Card style={{ padding: 12 }}>
              <Title2 style={{ fontSize: 16, marginBottom: 6 }}>总硬度</Title2>
              <Body1>硬度计算值：{hardness.calc.toFixed(2)} mg/L</Body1>
              <Body1>硬度实测值：{hardness.meas.toFixed(2)} mg/L</Body1>
              <Body1>相对误差：{hardness.error.toFixed(2)}%</Body1>
              <Body1>评价：{hardness.ok ? '合格' : '不合格'}</Body1>
            </Card>

            <Card style={{ padding: 12 }}>
              <Title2 style={{ fontSize: 16, marginBottom: 6 }}>沉淀溶解平衡</Title2>
              <Body1>CaCO₃：IAP={solubility.CaCO3.iap.toExponential(2)} | Ksp={solubility.CaCO3.ksp.toExponential(2)}（{solubility.CaCO3.status}）</Body1>
              <Body1>CaSO₄：IAP={solubility.CaSO4.iap.toExponential(2)} | Ksp={solubility.CaSO4.ksp.toExponential(2)}（{solubility.CaSO4.status}）</Body1>
              <Body1>PbCrO₄：IAP={solubility.PbCrO4.iap.toExponential(2)} | Ksp={solubility.PbCrO4.ksp.toExponential(2)}（{solubility.PbCrO4.status}）</Body1>
              <Body1>PbSO₄：IAP={solubility.PbSO4.iap.toExponential(2)} | Ksp={solubility.PbSO4.ksp.toExponential(2)}（{solubility.PbSO4.status}）</Body1>
              <Text size={200} style={{ color: 'var(--colorNeutralForeground2)' }}>判定：IAP&gt;Ksp 可能过饱和；IAP&lt;Ksp 可能未饱和</Text>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

