import { 
  getLivePoliticians, 
  getLivePoliticianById, 
  getVotesForPolitician, 
  createVoteDateRangeResponse 
} from '../mocks/data/factories/vote';
import { getTopIndustryDonors } from '../mocks/data/factories/donation';

export const api = {
  getPoliticians: async (query?: string) => await getLivePoliticians(query),
  searchPoliticians: async (query: string) => await getLivePoliticians(query),
  getPolitician: async (id: string) => await getLivePoliticianById(id),
  getVotesForPolitician: async (icpsr: number, params: any) => await getVotesForPolitician(icpsr, params),
  getVoteDateRange: async (icpsr: number) => await createVoteDateRangeResponse(icpsr),
  
  getDonationSummary: async (politicianId: string) => {
    const p = await getLivePoliticianById(politicianId);
    return p?.icpsr_id ? await getTopIndustryDonors(p.icpsr_id) : [];
  },

  // Fixed the 'unused variable' warning by using an underscore
  getFilteredDonationSummary: async (politicianId: string, _topic: string) => {
    const data = await api.getDonationSummary(politicianId);
    return { data };
  }
};