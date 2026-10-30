import {describe,it,expect} from 'vitest';
import {csvCell,salesSummary,saleItems} from '@/lib/admin-model';
describe('Admin sales',()=>{
 it('counts paid totals independently of unpaid orders',()=>expect(salesSummary([{id:'1',total:30,payment_status:'PAID'},{id:'2',total:200,payment_status:'UNPAID'}])).toEqual({totalOrders:2,paidOrders:1,amountPaid:30}));
 it('escapes CSV quotes and formula injection',()=>{expect(csvCell('a"b')).toBe('"a""b"');expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');});
 it('rejects malformed sales items',()=>expect(saleItems(null)).toEqual([]));
});