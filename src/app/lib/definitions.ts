export type Comments = {
  id: string;
  text: string;
  timestamp: Date;
  author: string;
};

export type orgProp = {
  id: number;
  name: string;
  username:string;
  avatar: string;
  leftNotifications: number;
  progress: number;
  rightNotifications: number;
  members: number;
};
export enum Roles{
  osas, org, admin, member
}

export type Orgs = {
  username: string;
  name: string;
  bio: string;
  adviser: string;
  accreditlvl: number;
  avatar: string;
};

export type Req = {
  //auto increment ID for mapping
  key:number,
  id: string;
  section: string;
  title: string;
  active: boolean;
};

export type OrgRequirementStatus = {
  orgUsername: string;
  requirementId: string;
  start: Date;
  due: Date;
  submitted: boolean;
  graded: boolean;
  score: number;
};

export type instructions= {
  comments: Comments[];
  newComment: string;

  activeTab: 'instructions' | 'grading';

  hasSubmitted: boolean;
  membershipAnswer: string;
  evaluationAnswer: string;

  score: number;
  submittedScore: number;
  maxScore: number;

  dueDate: Date | null;
  currentTime: number;

  isEditingInstructions: boolean;
  isEditingGrade: boolean;

  instructions: string;
  error: string | null;

  uploadedPdf: string | null;
  pdfFileName: string;
  currentPage: number;
  totalPages: number;
  pdfZoom: number;

  userRole: 'osas' | 'member' | null;
  currentUserEmail: string | null;

  loading: {
    page: boolean;
    requirement: boolean;
    grade: boolean;
    pdf: boolean;
  };

  submissiontype: 'freeform' | 'pdf' | null;

  requirement: {
    id: string;
    title: string;
    section: string;
    active: boolean;
  } | null;
  };
export const defaultPageState: instructions = {
  comments: [],
  newComment: '',
  activeTab: 'instructions',

  hasSubmitted: false,
  membershipAnswer: '',
  evaluationAnswer: '',

  score: 0,
  submittedScore: 0,
  maxScore: 100,

  dueDate: null,
  currentTime: Date.now(),

  isEditingInstructions: false,
  isEditingGrade: false,

  instructions: '',
  error: null,

  uploadedPdf: null,
  pdfFileName: '',
  currentPage: 1,
  totalPages: 1,
  pdfZoom: 1.0,

  userRole: null,
  currentUserEmail: null,

  loading: {
    page: true,
    requirement: false,
    grade: false,
    pdf: false,
  },

  submissiontype: null,
  requirement: null,
};