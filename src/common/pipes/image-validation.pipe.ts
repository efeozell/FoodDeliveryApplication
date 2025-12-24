import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';

export const ImageFilePipe = (sizeInMb: number = 2) => {
  return (
    new ParseFilePipeBuilder()
      // .addFileTypeValidator({
      //   fileType: /(jpeg|png|jpg|webp)$/,
      // })
      .addMaxSizeValidator({
        maxSize: sizeInMb * 1024 * 1024,
      })
      .build({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      })
  );
};
