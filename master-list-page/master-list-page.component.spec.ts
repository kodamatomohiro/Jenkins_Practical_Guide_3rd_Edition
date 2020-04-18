import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterListPageComponent } from './master-list-page.component';

import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  AlfrescoApiService,
  NodeFavoriteDirective,
  DataTableComponent,
  AppConfigPipe,
  UploadService
} from '@alfresco/adf-core';
import { DocumentListComponent } from '@alfresco/adf-content-services';
import { AppTestingModule } from '../testing/app-testing.module';
import { Router } from '@angular/router';
import { ContentManagementService } from '../services/content-management.service';

describe('MasterListPageComponent', () => {
  let component: MasterListPageComponent;
  let fixture: ComponentFixture<MasterListPageComponent>;
  let alfrescoApi: AlfrescoApiService;
  let page;
  let uploadService: UploadService;
  let contentManagementService: ContentManagementService;
  const mockRouter = {
    url: 'master-list-page'
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MasterListPageComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    page = {
      list: {
        entries: [{ entry: { id: 1 } }, { entry: { id: 2 } }],
        pagination: { data: 'data' }
      }
    };
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppTestingModule],
      declarations: [
        DataTableComponent,
        NodeFavoriteDirective,
        DocumentListComponent,
        MasterListPageComponent,
        AppConfigPipe
      ],
      providers: [
        {
          provide: Router,
          useValue: mockRouter
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    fixture = TestBed.createComponent(MasterListPageComponent);
    uploadService = TestBed.get(UploadService);
    contentManagementService = TestBed.get(ContentManagementService);
    component = fixture.componentInstance;

    fixture.detectChanges();

    alfrescoApi = TestBed.get(AlfrescoApiService);
    alfrescoApi.reset();

    spyOn(alfrescoApi.sharedLinksApi, 'findSharedLinks').and.returnValue(
      Promise.resolve(page)
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call document list reload on linksUnshared event', fakeAsync(() => {
    spyOn(component, 'reload');

    fixture.detectChanges();
    contentManagementService.linksUnshared.next();
    tick(500);

    expect(component.reload).toHaveBeenCalled();
  }));

  it('should call document list reload on fileUploadComplete event', fakeAsync(() => {
    spyOn(component, 'reload');

    fixture.detectChanges();
    uploadService.fileUploadComplete.next();
    tick(500);

    expect(component.reload).toHaveBeenCalled();
  }));

  it('should call document list reload on fileUploadDeleted event', fakeAsync(() => {
    spyOn(component, 'reload');

    fixture.detectChanges();
    uploadService.fileUploadDeleted.next();
    tick(500);

    expect(component.reload).toHaveBeenCalled();
  }));

  it('should call showPreview method', () => {
    const node = <any>{ entry: {} };
    spyOn(component, 'showPreview');
    fixture.detectChanges();

    component.preview(node);
    expect(component.showPreview).toHaveBeenCalledWith(node, {
      location: mockRouter.url
    });
  });

});
